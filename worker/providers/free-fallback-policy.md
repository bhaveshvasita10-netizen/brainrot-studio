# Free GPU fallback policy

The orchestrator may select a free provider only when its published rules permit the workload.

Priority:

1. Local RTX 5060
2. Available legitimate free hosted worker
3. Queue until a free worker becomes available

The system must not:

- create or rotate accounts to evade quotas
- spoof usage, identity, location, or device information
- bypass queues or anti-abuse controls
- turn a free notebook service into a prohibited persistent remote-control service
- promise unlimited free GPU compute

Google Colab free resources are explicitly dynamic and not guaranteed/unlimited. Hugging Face ZeroGPU also has published daily quotas. The application therefore treats both as opportunistic workers, not guaranteed production capacity.
