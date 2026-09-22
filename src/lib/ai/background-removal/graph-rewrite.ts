// Layer: ai. Runtime graph surgery for the BiRefNet Lite 512 graph.
//
// Upstream reality (onnxruntime-web 1.29/1.30/1.31-dev + current Chrome):
// the WebGPU GatherND helper kernel `computeSliceOffsets` emits
// `i32(uniforms.input_dims[input_dim_idx])`, where `input_dim_idx` is a
// DYNAMIC index into the `input_dims` uniform array. For data rank >= 5 that
// array is vec4-packed, so the expression yields `vec4<u32>` and Tint
// rejects the whole ShaderModule (`no matching constructor for
// 'i32(vec4<u32>)'`). All 80 GatherNDs in this graph gather from rank-5
// data (deformable-attention path), so WebGPU fails 484 validation errors
// deep and the run degrades to an all-background matte.
//
// Rewrite (exact, verified BIT-IDENTICAL on CPU over full 512x512
// inference): each GatherND(data [1,1,D,D,R], indices [1,1,N,2],
// batch_dims=2) becomes
//   dataR = Reshape(data, [1,1,D*D,R])
//   lin   = Squeeze(Gather(indices,0,axis=-1)) * D
//         + Squeeze(Gather(indices,1,axis=-1))     # [N]
//   out   = Gather(dataR, lin, axis=2)             # [1,1,N,R]
// Same elements, same order — Gather with int64 indices is fine on WebGPU.
// (In the BiRefNet Lite 512 graph all 80 sites have R=64; the rule itself
// holds for any R.)
//
// Robustness: zero matching GatherNDs (e.g. a future upstream export
// without them) is a pass-through, not an error. A GatherND that does NOT
// match the asserted pattern throws — never run a half-patched graph.

import { onnx } from 'onnx-proto';

const INT64 = 7;
const FLOAT16 = 10;

export interface RewriteResult {
	bytes: ArrayBuffer;
	replacedCount: number;
}

interface TensorMeta {
	elemType: number;
	/** null = symbolic dim (never matches the concrete pattern below). */
	dims: (number | null)[];
}

function metaOf(tensorType: onnx.TypeProto.ITensor): TensorMeta {
	const dims = (tensorType.shape?.dim ?? []).map((d) =>
		d.dimParam ? null : Number(d.dimValue ?? 0)
	);
	return { elemType: Number(tensorType.elemType ?? 0), dims };
}

function batchDimsOf(node: onnx.INodeProto): number {
	const attr = (node.attribute ?? []).find((a) => a.name === 'batch_dims');
	return attr ? Number(attr.i ?? 0) : 0;
}

function int64Tensor(name: string, dims: number[], values: number[]): onnx.TensorProto {
	return onnx.TensorProto.create({ name, dataType: INT64, dims, int64Data: values });
}

function makeNode(opType: string, inputs: string[], outputs: string[], axis?: number): onnx.NodeProto {
	return onnx.NodeProto.create({
		opType,
		input: inputs,
		output: outputs,
		// AttributeProto.type INT = 2.
		...(axis === undefined ? {} : { attribute: [{ name: 'axis', type: 2, i: axis }] })
	});
}

/** Applies the GatherND rewrite. Throws on pattern mismatch. */
export function rewriteGatherNdForWebGpu(modelBytes: ArrayBuffer): RewriteResult {
	const model = onnx.ModelProto.decode(new Uint8Array(modelBytes));
	const graph = model.graph;
	if (!graph) throw new Error('graph-rewrite: model has no graph');

	const meta = new Map<string, TensorMeta>();
	for (const v of [...(graph.input ?? []), ...(graph.valueInfo ?? []), ...(graph.output ?? [])]) {
		if (v.name && v.type?.tensorType) meta.set(v.name, metaOf(v.type.tensorType));
	}

	const extraInits: onnx.TensorProto[] = [
		int64Tensor('GND_g0', [1], [0]),
		int64Tensor('GND_g1', [1], [1]),
		int64Tensor('GND_sqax', [3], [0, 1, 3])
	];
	const shapeInits = new Map<string, string>();
	const d0Inits = new Map<number, string>();

	const nodes: onnx.INodeProto[] = [];
	let replaced = 0;
	for (const node of graph.node ?? []) {
		if (node.opType !== 'GatherND') {
			nodes.push(node);
			continue;
		}
		const bd = batchDimsOf(node);
		const data = meta.get(node.input?.[0] ?? '');
		const indices = meta.get(node.input?.[1] ?? '');
		const out = meta.get(node.output?.[0] ?? '');
		const ok =
			bd === 2 &&
			data?.elemType === FLOAT16 &&
			data.dims.length === 5 &&
			data.dims[0] === 1 &&
			data.dims[1] === 1 &&
			data.dims[2] === data.dims[3] &&
			indices?.elemType === INT64 &&
			indices.dims.length === 4 &&
			indices.dims[0] === 1 &&
			indices.dims[1] === 1 &&
			indices.dims[3] === 2 &&
			out?.elemType === FLOAT16 &&
			out.dims.length === 4 &&
			out.dims[0] === 1 &&
			out.dims[1] === 1 &&
			out.dims[2] === indices.dims[2] &&
			out.dims[3] === data.dims[4];
		if (!ok) {
			throw new Error(
				`graph-rewrite: GatherND '${node.name ?? '?'}' does not match the asserted ` +
					`(batch_dims=2, fp16 [1,1,D,D,R], int64 [1,1,N,2]) pattern — refusing to half-patch.`
			);
		}
		const d0 = (data as TensorMeta).dims[2] as number;
		const rr = (data as TensorMeta).dims[4] as number;
		const shapeKey = `${d0}x${rr}`;
		if (!shapeInits.has(shapeKey)) {
			shapeInits.set(shapeKey, `GND_shape_${shapeKey}`);
			extraInits.push(int64Tensor(`GND_shape_${shapeKey}`, [4], [1, 1, d0 * d0, rr]));
			d0Inits.set(d0, `GND_d0_${d0}`);
			extraInits.push(int64Tensor(`GND_d0_${d0}`, [], [d0]));
		}
		const p = (node.name ?? `gathernd_${replaced}`).replace(/[/.]/g, '_');
		const [dataR, i0r, i1r, i0, i1, t, lin] = ['dataR', 'i0r', 'i1r', 'i0', 'i1', 't', 'lin'].map(
			(s) => `GND_${p}_${s}`
		);
		const dataInput = (node.input as string[])[0];
		const idxInput = (node.input as string[])[1];
		const outName = (node.output as string[])[0];
		nodes.push(makeNode('Reshape', [dataInput, shapeInits.get(shapeKey) as string], [dataR]));
		nodes.push(makeNode('Gather', [idxInput, 'GND_g0'], [i0r], -1));
		nodes.push(makeNode('Gather', [idxInput, 'GND_g1'], [i1r], -1));
		nodes.push(makeNode('Squeeze', [i0r, 'GND_sqax'], [i0]));
		nodes.push(makeNode('Squeeze', [i1r, 'GND_sqax'], [i1]));
		nodes.push(makeNode('Mul', [i0, d0Inits.get(d0) as string], [t]));
		nodes.push(makeNode('Add', [t, i1], [lin]));
		nodes.push(makeNode('Gather', [dataR, lin], [outName], 2));
		replaced += 1;
	}

	if (replaced === 0) return { bytes: modelBytes.slice(0), replacedCount: 0 };
	graph.node = nodes as onnx.NodeProto[];
	graph.initializer = [...(graph.initializer ?? []), ...extraInits];
	const encoded = onnx.ModelProto.encode(model).finish();
	// finish() may return a view over a larger buffer — copy to exact size.
	const exact = new Uint8Array(encoded.length);
	exact.set(encoded);
	return { bytes: exact.buffer as ArrayBuffer, replacedCount: replaced };
}
