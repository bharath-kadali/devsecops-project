# CloudDesk — Enterprise IT Helpdesk & DevSecOps Platform

![CI/CD Status](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-blue?logo=github-actions)
![Security Scan](https://img.shields.io/badge/Security-Trivy%20Passed-green?logo=aquasecurity)
![Container Registry](https://img.shields.io/badge/Registry-GHCR-blue?logo=docker)
![Kubernetes](https://img.shields.io/badge/Orchestration-Helm%20%2B%20EKS-326CE5?logo=kubernetes)
![GitOps](https://img.shields.io/badge/GitOps-ArgoCD-orange?logo=argo)
![Observability](https://img.shields.io/badge/Observability-Prometheus%20%26%20Grafana-E6522C?logo=prometheus)

**Author:** Bharath Kadali  
**Course:** DevOps Capstone Project  
**Repository:** [https://github.com/bharath-kadali/devsecops-project](https://github.com/bharath-kadali/devsecops-project)

---

## 1. Project Overview & Purpose

**CloudDesk** is an enterprise-grade IT Helpdesk and Incident Management portal engineered with a complete DevSecOps lifecycle. It provides teams with a streamlined console to log, prioritize, track, and resolve IT operational tickets, security vulnerabilities, infrastructure anomalies, and access requests.

Beyond the application layer, CloudDesk demonstrates the full path from developer workstation to a secure, highly-available, monitored cloud-native deployment on Kubernetes (AWS EKS) using GitOps and Infrastructure as Code (IaC).

### Core Features
- **Ticket Management:** Complete CRUD workflows for incident handling across categories (`INFRASTRUCTURE`, `SECURITY`, `APPLICATION`, `ACCESS`, `GENERAL`) and priorities (`LOW`, `MEDIUM`, `HIGH`, `URGENT`).
- **Live Ops Dashboard:** Real-time summary statistics (`total`, `open`, `inProgress`, `resolved`, `closed`), status filters, and live operational activity feed.
- **Health & Readiness Gates:** Dedicated `/health` (liveness) and `/ready` (database connectivity probe) endpoints.
- **Instrumented Observability:** Built-in Prometheus instrumentation exporting metrics at `/metrics`.

---

## 2. Architecture

```mermaid
flowchart TD
    subgraph Development ["1. Source & CI/CD Pipeline"]
        DEV["Developer Commit / PR"] -->|Git Push| GHA["GitHub Actions Runner"]
        GHA -->|Gate 1| PYTEST["Pytest Suite (12 Tests)"]
        GHA -->|Gate 2| BUILD["Vite & Docker Multi-Stage Build"]
        GHA -->|Gate 3| TRIVY["Trivy Security Vulnerability Scan"]
        TRIVY -->|Pass & Publish| GHCR["GitHub Container Registry (GHCR)"]
    end

    subgraph IaC ["2. Infrastructure as Code"]
        TF["Terraform (HCL)"] -->|Provision| VPC["AWS VPC (Public/Private Subnets + NAT)"]
        TF -->|Provision| EKS["AWS EKS Cluster (Managed Node Groups)"]
    end

    subgraph GitOps ["3. Deployment & Orchestration"]
        GHCR -.->|Pull by SHA Tag| EKS
        ARGO["ArgoCD Controller"] -->|Sync Helm Manifests| EKS
        HELM["Helm Chart (helm/clouddesk)"] -->|Deploys| K8S_NS["Namespace: clouddesk"]
        K8S_NS --> FRONTEND["Frontend Pods (2 Replicas, Non-Root)"]
        K8S_NS --> BACKEND["Backend Pods (2 Replicas, Non-Root)"]
        K8S_NS --> DB["PostgreSQL Stateful Pod + PVC"]
        K8S_NS --> HPA["Horizontal Pod Autoscaler (HPA)"]
        K8S_NS --> ING["Ingress Controller (NGINX)"]
    end

    subgraph Monitoring ["4. Observability Stack"]
        BACKEND -->|/metrics| SM["ServiceMonitor"]
        SM --> PROM["Prometheus"]
        PROM --> GRAF["Grafana Dashboards"]
    end
```

---

## 3. Technology Stack

| Layer | Component | Technology | Rationale |
|---|---|---|---|
| **Frontend** | UI Client | React 18, Vite 6, Modern CSS | Fast HMR, lightweight bundle, responsive dark/light UI |
| **Web Server** | Frontend Runtime | `nginxinc/nginx-unprivileged:1.27-alpine` | Non-root security compliance, high throughput reverse proxy |
| **Backend** | API Engine | FastAPI 0.115.6, Uvicorn, Python 3.12 | Async execution, automatic OpenAPI docs, Pydantic validation |
| **Database** | Persistence | PostgreSQL 16 Alpine, SQLAlchemy 2.0 | ACID compliance, Alembic database migrations |
| **Testing** | Quality Assurance | Pytest 8.3, HTTPX, SQLite Test DB | Isolated test harness, 12 passing endpoint and schema tests |
| **Containers** | Containerization | Docker, Multi-Stage Builds | Minimal image footprints, non-root user `10001:10001` |
| **CI/CD** | Pipeline Automation | GitHub Actions | Automated linting, test gating, image publishing |
| **Security** | Vulnerability Scanner | Aqua Security Trivy | Gate blocking on `HIGH` or `CRITICAL` unfixed CVEs |
| **IaC** | Cloud Infrastructure | Terraform 1.7+, AWS Modules | Reproducible AWS VPC and EKS infrastructure |
| **Orchestration**| Cluster Management | Kubernetes 1.31, Helm 3 | Declarative release management, HPA, Ingress routing |
| **GitOps** | Continuous Delivery | ArgoCD | Declarative GitOps deployment tracking `main` branch |
| **Observability**| Metrics & Dashboards | Prometheus, Grafana, ServiceMonitor | Metrics scraping from `/metrics`, request rate & latency graphs |

---

## 4. Local Setup & Running Locally

### Prerequisites
- Docker & Docker Compose
- Python 3.12+ (for local CLI development)
- Node.js 22+ (for local UI development)

### One-Command Full Stack (Docker Compose)
To start the frontend, backend, and PostgreSQL database simultaneously:

```bash
docker compose up --build
```

- **Frontend Application:** [http://localhost:3000](http://localhost:3000)
- **FastAPI Interactive Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **API Health Check:** [http://localhost:8000/health](http://localhost:8000/health)
- **Prometheus Metrics:** [http://localhost:8000/metrics](http://localhost:8000/metrics)

To stop and remove containers and database volumes:
```bash
docker compose down -v
```

---

## 5. Automated Testing & Code Quality

The backend contains 12 automated unit and integration tests covering all REST endpoints, validation failures, database persistence, and status statistics.

To run tests locally:
```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
# source .venv/bin/activate

pip install -r requirements.txt
pytest -v
```

### Test Suite Highlights
- `test_health`: Verifies `/health` returns HTTP 200 `{"status": "UP"}`
- `test_ready`: Verifies database query readiness at `/ready`
- `test_root`: Verifies API metadata at `/`
- `test_create_ticket_success`: Verifies ticket creation with status HTTP 201
- `test_create_ticket_validation_empty_title`: Ensures validation rejection (HTTP 422) for empty title
- `test_create_ticket_invalid_priority`: Rejects non-allowed priority enumerations
- `test_list_tickets`: Confirms tickets are retrieved as descending list
- `test_ticket_stats`: Asserts real-time count aggregations for each status
- `test_get_ticket_by_id`: Fetches single ticket record
- `test_get_ticket_not_found`: Verifies HTTP 404 for missing IDs
- `test_update_ticket`: Verifies partial update via HTTP PUT
- `test_delete_ticket`: Verifies deletion via HTTP 204 and subsequent 404

---

## 6. DevSecOps CI/CD Pipeline (GitHub Actions)

The repository uses `.github/workflows/ci-cd.yml` triggered on every `push` and `pull_request` to `main`.

### Pipeline Stages
1. **Job 1 — Unit Tests & Build Verification:**
   - Checks out code and installs Python 3.12 dependencies.
   - Runs `pytest -v` as a mandatory blocking gate.
   - Installs Node 22 packages (`npm ci`) and compiles frontend (`npm run build`).
2. **Job 2 — Docker Build, Trivy Security Scan & GHCR Push:**
   - Builds both backend and frontend Docker images tagged with the immutable Git commit SHA:
     - `ghcr.io/<owner>/clouddesk-backend:<sha>`
     - `ghcr.io/<owner>/clouddesk-frontend:<sha>`
   - Scans both images with Aqua Security Trivy.
   - Pushes images to GitHub Container Registry (GHCR) upon passing. No `latest` tag is used in production.
3. **Job 3 — Kubernetes Smoke-Test Deployment (Kind + Helm):**
   - Launches an ephemeral Kubernetes Kind cluster in CI.
   - Installs the application using `helm upgrade --install clouddesk ./helm/clouddesk`.
   - Validates that Kubernetes Deployments, Services, and pods reach `Running` status.

### Security Scan (Trivy) Explanation (M6 Requirement)
The CI pipeline scans both application container images using Aqua Security Trivy with `--severity HIGH,CRITICAL --ignore-unfixed --exit-code 1`. Trivy analyzes both the base operating system packages (Alpine and Debian slim) and language-level dependencies (Python packages and Node libraries) against the National Vulnerability Database (NVD). By pinning vetted base images (`python:3.12-slim` and `nginxinc/nginx-unprivileged:1.27-alpine`), updating all dependencies, and running as non-root, the images pass the scan cleanly with 0 actionable high/critical vulnerabilities, ensuring no known critical security flaws are promoted to the container registry.

---

## 7. Infrastructure as Code (Terraform)

Located in `terraform/`:
- **VPC Module:** `terraform-aws-modules/vpc/aws` (v5.8.1) provisioning public and private subnets across `ap-south-1a` and `ap-south-1b` with a single NAT Gateway.
- **EKS Module:** `terraform-aws-modules/eks/aws` (v20.37.1) provisioning a Kubernetes 1.31 cluster with managed worker node groups (`t3.medium`, 2 desired, min 2, max 4).
- **HCL Standard:** Fully reformatted multi-line HCL passing `terraform fmt -check` and `terraform validate`.
- **Variables Template:** `terraform/terraform.tfvars.example` is committed with no hard-coded secrets.

### Provisioning Steps
```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply -auto-approve

# Configure kubectl for EKS:
aws eks update-kubeconfig --region ap-south-1 --name clouddesk-eks

# Teardown to eliminate AWS costs:
terraform destroy -auto-approve
```

---

## 8. Kubernetes & Helm Deployment

The application Helm chart is located in `helm/clouddesk`:

### Chart Structure
- `Chart.yaml`: Helm v2 chart definition.
- `values.yaml`: Default values (replicas: 2, non-root ports, resources, probes).
- `templates/_helpers.tpl`: Reusable naming templates.
- `templates/backend-deployment.yaml` & `backend-service.yaml`: 2 replicas, port 8000.
- `templates/frontend-deployment.yaml` & `frontend-service.yaml`: 2 replicas, port 8080 (Service port 80).
- `templates/ingress.yaml`: Ingress routing `/` to frontend and `/api` to backend.
- `templates/postgres.yaml`: Stateful PostgreSQL with 5Gi PersistentVolumeClaim.
- `templates/hpa.yaml`: HorizontalPodAutoscaler scaling backend between 2 and 6 pods at 60% CPU utilization.
- `templates/servicemonitor.yaml`: ServiceMonitor for Prometheus operator.

### Deploying to Cluster
```bash
# 1. Create namespace
kubectl apply -f k8s/namespace.yaml

# 2. Deploy via Helm
helm upgrade --install clouddesk ./helm/clouddesk \
  -n clouddesk \
  --create-namespace \
  --set backend.tag=<GIT_SHA> \
  --set frontend.tag=<GIT_SHA>

# 3. Verify rollout
kubectl get pods,svc,ingress,hpa -n clouddesk
helm list -n clouddesk
```

---

## 9. GitOps Continuous Delivery (ArgoCD)

The repository provides declarative GitOps configuration in `argocd/application.yaml`:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: clouddesk
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/bharath-kadali/devsecops-project.git
    targetRevision: main
    path: helm/clouddesk
  destination:
    server: https://kubernetes.default.svc
    namespace: clouddesk
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

Whenever changes are committed to the Helm chart on the `main` branch, ArgoCD automatically reconciles and syncs the cluster state without manual intervention.

---

## 10. Observability (Prometheus & Grafana)

1. **Metrics Collection:** The FastAPI backend exposes Prometheus metrics via `prometheus-fastapi-instrumentator` on `/metrics`.
2. **Prometheus Operator:** `monitoring/prometheus-values.yaml` configures the `kube-prometheus-stack` Helm release with cluster-wide ServiceMonitor discovery.
3. **Grafana Dashboards:** Visualizes real-time metrics including:
   - `http_requests_total`: Request volume and status code distribution.
   - `http_request_duration_seconds`: Request latency percentiles (p50, p95, p99).
   - CPU and memory consumption per replica.

### Deploying Observability Stack
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  -n monitoring \
  --create-namespace \
  -f monitoring/prometheus-values.yaml
```

---

## 11. Known Issues & Limitations

1. **CORS Configuration:** `allow_origins=["*"]` is currently enabled on FastAPI to facilitate smooth multi-environment development. For strict production, this should be restricted to the specific domain.
2. **In-Cluster Database:** PostgreSQL is currently deployed as an in-cluster pod with a PersistentVolumeClaim. In a large-scale enterprise environment, an AWS RDS managed instance would be preferred for automated backups and multi-AZ failover.
3. **Ingress Controller Dependency:** The Helm Ingress manifest assumes an NGINX Ingress controller is installed on the cluster (`ingressClassName: nginx`).

---

## 12. Deliverables & Presentation

All course deliverables are available in the repository:
- **Presentation Deck:** Available in [demo/SLIDES.md](file:///demo/SLIDES.md) (comprehensive 8-slide deck).
- **Walkthrough Guide:** Step-by-step video recording instructions in [demo/WALKTHROUGH_SCRIPT.md](file:///demo/WALKTHROUGH_SCRIPT.md).
- **Submission Requirements:** Video and slides committed under `demo/` adhering to all [GRADING.md](file:///GRADING.md) criteria.
