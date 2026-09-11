# Sparse Attention 六项改进验收

已实现指标澄清、收益到部件联动、信息取舍、密度优化、增长趋势、双向记录追踪。主工作流和三项同屏保留。

## 验收结果

- 浏览器96个代表状态：DSA/CSA/HCA、中文/英文、390/1024/1517px、全部合法节点；三项收益和三项展开趋势均存在，无目标面板横向溢出，无KaTeX错误。
- 另检查手机最短/最长历史的32个节点状态；空压缩组和长索引列表正常。
- 全局C4缓存→索引→输出保持选择；局部L24输出→来源保持位置；未读C1无输出贡献且可回溯。
- Top-K变化只改变读取与输出，不改变缓存/容量；记录排序保持记录身份；预算独立影响可容纳历史。
- 模型检查12,288快照，导航168、资源108，以及新增192个独立参照/趋势/覆盖检查通过。生产构建和项目约定检查通过。

[浏览器原始结果](browser-results.json) · [QA矩阵](../../../src/components/sparse-attention/explorer-qa-matrix.json) · [设计与模型边界](../../sparse-attention-design.md)

## 最终页面

趋势仍位于三项收益各自的卡片内；可一起展开/收起。图中记录数量由当前参数推导。

![收益与趋势](C:/Users/29043/Documents/LLM-Infra-Explorer/docs/audits/sparse-attention-six-fixes/overview.jpg)

点击收益分项定位部件后，左侧数量保持可见，右侧资源摘要、记录追踪、列表和解释同时工作。

![索引与记录追踪](C:/Users/29043/Documents/LLM-Infra-Explorer/docs/audits/sparse-attention-six-fixes/index.jpg)

## 限定

数字为单层假设字节与未训练二维投影。输出参照描述向量差异，不是实际准确率；位置覆盖不是语义信息保留率；读取量不是吞吐，可容纳历史不是模型有效上下文。尚未完成读屏器专项合规评测。
