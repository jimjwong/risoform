# Tailnet demo preview

The demo preview runs on the `smallisland-ai` Tailscale node at
<https://smallisland-ai.tail94b909.ts.net:3111>. Tailscale Serve proxies HTTPS
traffic to a Docker container bound only to `127.0.0.1:3111`. This route is
tailnet only; Funnel is not enabled.

The preview is also listed as **Risoform** in the local jDash project launcher
at `D:\Development\Projects\jDash`. jDash links to the same tailnet URL.

This image is built **without Supabase configuration**. It offers the browser
demo workspace only. Demo forms are stored in that browser's local storage;
they cannot be published or collect live responses. Do not put sensitive data
in the preview. The Supabase CLI development stack on this machine must not
be used as the externally reachable production database.

## Rebuild and restart

From the repository root:

```powershell
docker build --build-arg NEXT_PUBLIC_SUPABASE_URL= --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY= -t risoform:tailnet-demo .
docker stop risoform-tailnet-demo
docker rm risoform-tailnet-demo
docker run -d --name risoform-tailnet-demo --restart unless-stopped -p 127.0.0.1:3111:3000 risoform:tailnet-demo
tailscale serve --bg --https=3111 http://127.0.0.1:3111
```

The `docker stop` and `docker rm` steps apply only when replacing an existing
preview container. Check the route with `tailscale serve status` and open the
HTTPS URL from a signed-in tailnet device. Tailscale access follows this
tailnet's device and user policies.

To take the preview offline:

```powershell
tailscale serve --https=3111 off
docker stop risoform-tailnet-demo
```

The production app and self-hosted Supabase deployment on Coolify are separate
from this preview; see [DEPLOYMENT.md](DEPLOYMENT.md).
