# 本地转写质量评测

Tiny、Base、Small 使用带词时间戳输出的本地权重。普通、不含 attention 输出的权重不能满足删词剪辑要求，已从可选列表中移除。已有完整转写和剪辑版本继续可读，旧模型未完成的转写会使用当前选择重新开始。

默认 Tiny，Base 为均衡档，Small 为需要更多内存的实验档。下载来自公开模型仓库，识别在本机进行；未加入任何付费转写调用。首次下载与缓存占用需要考虑，模型切换会释放旧推理会话。

## 可重复的评测

准备仅包含本地音频路径和人工参考文字的 JSON，单条短于 120 秒：

```json
[{ "id": "product-01", "audio": "product.wav", "reference": "这款保温杯放进包里也不漏水。", "language": "zh" }]
```

```sh
node scripts/benchmark-local-asr.mjs --manifest samples.json --model tiny --output tiny-report.json --allow-download
node scripts/benchmark-local-asr.mjs --manifest samples.json --model base --output base-report.json --allow-download
node scripts/benchmark-local-asr.mjs --manifest samples.json --model small --output small-report.json --allow-download
```

只在允许首次下载时传 `--allow-download`；后续不传会仅使用缓存。用 `--cache` 指定模型缓存目录。每个模型使用独立进程，报告字符错误率（CER）、逐项识别文字、时间戳合法比例、加载/推理耗时、实时因子和进程峰值内存。音频不会上传。

CER 仅归一化全角、大小写、标点和空白，保留简繁体与数字写法差异。CER 不能替代人工语义与时间对齐检查：例如「九十九」与「99」或简繁转换仍会计为字符差异。时间戳合法比例只检查数值、顺序和边界，不表示字词对齐准确率。

## 2026-09-05 本机检查

macOS arm64、Node CPU q8、同一条 8.94 秒系统合成中文商品介绍：

| 模型 | 原始 CER | 推理时间 | 实时因子 | 进程峰值内存 | 时间戳合法比例 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Tiny timestamped | 27.0% | 0.70 s | 0.078 | 760 MB | 100% |
| Base timestamped | 37.8% | 0.99 s | 0.111 | 1056 MB | 100% |
| Small timestamped | 37.8% | 1.83 s | 0.205 | 1947 MB | 100% |

人工复核中 Base 与 Small 在这条样本输出相同，包含简繁体及数字格式转换；Tiny 有实词误识别，因此不能按这个原始 CER 表认定 Tiny 更准确。该样本仅用于兼容性冒烟，不代表真实噪声、方言、商品词或长音频表现，也不用于自动切换默认模型。

浏览器另以 Tiny、WebGPU（encoder fp32 / decoder q4）完成同一音频的导入、分块提取、转写、时间线保存。CPU q8 的耗时与文字结果不等于浏览器 WebGPU/WASM 的结果。
