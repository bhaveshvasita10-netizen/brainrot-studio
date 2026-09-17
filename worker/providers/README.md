# Brainrot Studio GPU Provider Layer

This folder defines the provider contract for real video rendering.

Supported deployment targets:

1. Local ASUS RTX 5060 worker
2. Hugging Face ZeroGPU Space
3. Google Colab batch worker
4. Kaggle batch worker
5. Future paid GPU endpoint

All providers should implement the same job lifecycle:

`queued -> running -> completed | failed | cancelled`

The web application should never assume that a particular GPU provider is available. A provider is selected by the worker/orchestrator and jobs can be retried on another provider.

## Free-resource rules

- Never attempt to bypass provider quotas, anti-abuse controls, authentication, or runtime restrictions.
- Do not use multiple accounts to evade quotas.
- Do not claim that free GPU services are unlimited.
- Persist job state and output metadata outside ephemeral GPU runtimes.
- A successful real render means an actual MP4 passed media validation; configuration-only QA does not count.

## Recommended order

Use the local RTX 5060 whenever it is online. Use legitimate free hosted compute opportunistically when available. If no free worker is available, leave the job queued rather than silently charging a paid provider.
