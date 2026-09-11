// Single-layer, single-sequence logical payload. BF16 throughout; no allocator or TP copies.
export const KV_MODES = ['mha', 'gqa', 'mla'];
export const KV_DEFAULTS = { mode: 'mha', tokens: 8, groups: 2, latent: 128, head: 0, token: 0 };
const integer = (v, fallback, lo, hi) => Math.max(lo, Math.min(hi, Number.isFinite(+v) ? Math.round(+v) : fallback));
export function deriveKvRepresentationModel(input = {}) {
  const mode = KV_MODES.includes(input.mode) ? input.mode : KV_DEFAULTS.mode;
  const tokens = integer(input.tokens ?? 8, 8, 1, 16);
  const groups = [1, 2, 4, 8].includes(+input.groups) ? +input.groups : 2;
  const latent = [32, 64, 128, 256].includes(+input.latent) ? +input.latent : 128;
  const head = integer(input.head ?? 0, 0, 0, 7);
  const token = integer(input.token ?? 0, 0, 0, tokens - 1);
  const heads = 8, headDim = 64, ropeDim = 32, bytesPerElement = 2;
  const groupCount = mode === 'mha' ? heads : mode === 'gqa' ? groups : 1;
  const selectedGroup = Math.floor(head / (heads / groupCount));
  const bytes = { mha: 2 * heads * headDim * bytesPerElement, gqa: 2 * groups * headDim * bytesPerElement, mla: (latent + ropeDim) * bytesPerElement };
  const records = Array.from({ length: groupCount }, (_, g) => ({
    id: g, selected: g === selectedGroup,
    consumers: Array.from({ length: heads / groupCount }, (_, i) => g * (heads / groupCount) + i),
  }));
  const fields = mode === 'mla'
    ? [{ id: 'latent', tex: `c^{KV}_{${token + 1}}`, channels: latent, role: 'latentField' }, { id: 'rope', tex: `k^R_{${token + 1}}`, channels: ropeDim, role: 'ropeField' }]
    : [{ id: 'key', tex: `k_{${token + 1},${selectedGroup + 1}}`, channels: headDim, role: 'keyField' }, { id: 'value', tex: `v_{${token + 1},${selectedGroup + 1}}`, channels: headDim, role: 'valueField' }];
  const perToken = bytes[mode];
  return {
    mode, tokens, groups, latent, head, token, heads, headDim, ropeDim, groupCount, selectedGroup, records,
    queryHeads: Array.from({ length: heads }, (_, i) => ({ id: i, group: Math.floor(i / (heads / groupCount)), selected: i === head })),
    rows: Array.from({ length: tokens }, (_, i) => ({ id: i, selected: i === token })),
    fields: fields.map(f => ({ ...f, bytes: f.channels * bytesPerElement, units: f.channels / 32 })),
    perToken, totalBytes: tokens * perToken, ratio: bytes.mha / perToken,
    comparisons: KV_MODES.map(id => ({ id, perToken: bytes[id], totalBytes: bytes[id] * tokens, fraction: bytes[id] / bytes.mha })),
    formula: mode === 'mla' ? 'B=N(d_c+d_R)b' : 'B=2NH_{KV}d_hb',
    substitution: mode === 'mla' ? `B=${tokens}(${latent}+${ropeDim})\\times2=${tokens * perToken}\\;\\mathrm{B}` : `B=2\\times${tokens}\\times${groupCount}\\times64\\times2=${tokens * perToken}\\;\\mathrm{B}`,
    // Conceptual read path; MLA's content up-projections may be absorbed for decode.
    writeFormula: mode === 'mla' ? 'c_t^{KV}=W^{DKV}h_t,\\quad k_t^R=\\operatorname{RoPE}(W^{KR}h_t)' : 'k_{t,g}=\\operatorname{RoPE}(W_g^Kh_t),\\quad v_{t,g}=W_g^Vh_t',
    readFormula: mode === 'mla' ? '(q_i^C)^T W_i^{UK}c_t^{KV}+(q_i^R)^Tk_t^R' : `q_{${head + 1}}^T k_{t,${selectedGroup + 1}}`,
    code: mode === 'mla'
      ? 'c = down_project(hidden)\nk_rope = rope(key_rope_project(hidden), position)\nslot = layer_cache.reserve(position)\nlayer_cache.write(slot, c, k_rope)\nq_content, q_rope = query_project(current_hidden)\nq_absorbed = absorb_key_projection(q_content)\nout = mla_decode(q_absorbed, q_rope, layer_cache)'
      : `q, k, v = project(current_hidden, kv_heads=${groupCount})\nq, k = rope(q, k, position)\nslot = layer_cache.reserve(position)\nlayer_cache.write(slot, k, v)\nhead_to_kv = query_head // ${heads / groupCount}\nout = attention(q, layer_cache, head_to_kv)`,
  };
}
