# Architecture

## Runtime request path

Two independent paths from the browser. The page itself is a cached static asset. The visit counter is a separate API call that never touches CloudFront.

```mermaid
flowchart TB
    subgraph client["Visitor"]
        U["Browser<br/>React single page app"]
    end

    subgraph edge["Edge and delivery"]
        R53["Route 53<br/>alias A and AAAA records"]
        ACM["ACM certificate<br/>us-east-1, DNS validated"]
        CF["CloudFront distribution<br/>HTTP/3, security headers,<br/>403 and 404 rewrite to index.html"]
    end

    subgraph origin["Private origin"]
        S3[("S3 bucket<br/>no public access,<br/>versioned, AES256")]
    end

    subgraph api["Serverless backend"]
        AGW["API Gateway<br/>HTTP API, throttled"]
        LAM["Lambda<br/>Python 3.11 on arm64<br/>CORS allowlist"]
        DDB[("DynamoDB<br/>on demand, PITR")]
    end

    subgraph obs["Observability"]
        CW["CloudWatch logs<br/>30 day retention"]
        ALM["CloudWatch alarms<br/>Lambda errors, API 5xx"]
        XR["X Ray traces"]
    end

    U -->|"1. resolve hostname"| R53
    R53 -->|"2. alias to distribution"| CF
    ACM -.->|"attached at TLS termination"| CF
    CF -->|"3. cache miss, SigV4 signed by OAC"| S3
    S3 -->|"4. object"| CF
    CF -->|"5. HTML, JS, CSS, fonts"| U

    U -->|"6. POST or GET /visits"| AGW
    AGW -->|"7. proxy payload v2.0"| LAM
    LAM -->|"8. UpdateItem with ADD"| DDB
    DDB -->|"9. new count"| LAM
    LAM -->|"10. JSON plus CORS headers"| U

    LAM --> CW
    AGW --> CW
    LAM --> XR
    CW --> ALM
```

### Why the two paths never meet

The counter is not routed through CloudFront. Putting an API behind the same distribution means either a second cache behavior with caching disabled, or a counter that returns a stale number from the edge. Keeping them separate costs one extra DNS lookup on first paint and removes a whole class of caching bug.

The tradeoff is CORS. That is why the Lambda owns the allowlist and refuses an unrecognized origin with a 403 rather than silently omitting a header.

## Trust boundaries

```mermaid
flowchart LR
    subgraph public["Public internet"]
        ANY["Any client"]
    end

    subgraph aws["AWS account"]
        CF2["CloudFront"]
        S32[("S3 bucket")]
        AGW2["API Gateway"]
        LAM2["Lambda"]
        DDB2[("DynamoDB")]
    end

    ANY -->|"allowed"| CF2
    ANY -->|"allowed, origin checked"| AGW2
    ANY -.->|"denied by public access block<br/>and bucket policy"| S32

    CF2 -->|"s3:GetObject only,<br/>conditioned on AWS:SourceArn"| S32
    AGW2 -->|"lambda:InvokeFunction,<br/>scoped to this API"| LAM2
    LAM2 -->|"GetItem and UpdateItem only,<br/>on one table ARN"| DDB2
```

Every arrow inside the account is a named action on a named resource. There is no wildcard resource in the Lambda execution role, and the bucket policy grants read to the CloudFront service principal only when the request carries this distribution's ARN.

## Delivery pipeline

```mermaid
flowchart TB
    DEV["git push to main"]

    subgraph fe["frontend-deploy.yml"]
        FB["npm ci, eslint, vite build"]
        FA["assume frontend role<br/>via OIDC"]
        FS1["sync assets/*<br/>immutable, one year"]
        FS2["sync index.html<br/>no cache"]
        FI["create invalidation<br/>then wait for completion"]
    end

    subgraph be["backend-deploy.yml"]
        BT["pytest with moto<br/>coverage gate at 90 percent"]
        BS["terraform fmt<br/>checkov scan"]
        BP["assume plan role<br/>read only, terraform plan"]
        GATE{{"GitHub environment<br/>required reviewer"}}
        BA["assume apply role<br/>terraform apply saved plan"]
        SMOKE["curl the counter endpoint"]
    end

    DEV -->|"frontend/** changed"| FB
    FB --> FA --> FS1 --> FS2 --> FI

    DEV -->|"backend/** or terraform/** changed"| BT
    BT --> BS --> BP --> GATE
    GATE -->|"approved"| BA --> SMOKE
    GATE -->|"rejected"| STOP["no credentials issued"]
```

The plan job and the apply job assume different roles. The plan role carries `ReadOnlyAccess`, so a plan running on a pull request cannot change infrastructure even if the workflow file in that pull request is modified. The apply role is trusted only for the `production` environment claim, which means the credentials that can write do not exist until a human has approved the run.

## Resource inventory

| Layer | Resource | Notable configuration |
| --- | --- | --- |
| DNS | Route 53 alias records | Created only when `enable_custom_domain` is true |
| TLS | ACM certificate | us-east-1, DNS validated, waits for issuance |
| CDN | CloudFront distribution | OAC origin, HTTP/3, HSTS, CSP, SPA error rewrite |
| Origin | S3 bucket | Public access blocked, versioned, lifecycle expiry |
| API | API Gateway HTTP API | No CORS block, access logs, 25 request per second cap |
| Compute | Lambda | Python 3.11, arm64, 256 MB, 5 second timeout, X Ray |
| Data | DynamoDB table | On demand, PITR, deletion protection, encrypted |
| Identity | 3 IAM roles for GitHub | OIDC federated, subject pinned, no access keys |
| State | S3 bucket plus DynamoDB table | Versioned state, lock table, both protected from destroy |
| Alarms | 2 CloudWatch alarms | Lambda errors and API 5xx |
