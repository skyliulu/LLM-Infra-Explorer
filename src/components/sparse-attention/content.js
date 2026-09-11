export const getInitialLang = () => typeof navigator !== 'undefined' && navigator.language.startsWith('zh') ? 'zh' : 'en';
export const i18n = {
  "zh": {
    "title": "稀疏与压缩注意力",
    "language": "Switch to English",
    "reset": "重置实验",
    "tokens": "历史长度（含当前 token）",
    "query": "当前 query",
    "queryA": "Query A",
    "queryB": "Query B",
    "drillPath": "当前钻取路径",
    "records": "条目",
    "ratio": "每组新 token 数",
    "window": "局部窗口",
    "topK": "Top-K 上限",
    "previous": "前一组",
    "currentGroup": "当前组",
    "indexVars": "两组 index query 分别与索引 key 做内积，经 ReLU 与 head 权重汇总。并列分数按条目顺序选取。",
    "readHint": "条长是示例 attention 权重；所有被读取的全局与局部项共同归一化。",
    "sourceDsa": "DeepSeek V3.2 · §2.1 DSA",
    "sourceV4": "DeepSeek V4 · §2.3 / §3.5 / §4.2"
  },
  "en": {
    "title": "Sparse & Compressed Attention",
    "language": "切换到中文",
    "reset": "Reset experiment",
    "tokens": "History length (including current token)",
    "query": "Current query",
    "queryA": "Query A",
    "queryB": "Query B",
    "drillPath": "Current inspection path",
    "records": "entries",
    "ratio": "New tokens per group",
    "window": "Local window",
    "topK": "Top-K limit",
    "previous": "Previous group",
    "currentGroup": "Current group",
    "indexVars": "Two index-query heads take dot products with the index key, then combine ReLU scores with head weights. Ties use entry order.",
    "readHint": "Bar length encodes example attention weight. All read global and local entries normalize together.",
    "sourceDsa": "DeepSeek V3.2 · §2.1 DSA",
    "sourceV4": "DeepSeek V4 · §2.3 / §3.5 / §4.2"
  }
};
