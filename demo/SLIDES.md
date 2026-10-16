# CloudDesk DevSecOps Capstone Presentation Deck

**Presenter:** Bharath Kadali  
**Course:** DevOps Capstone Project  
**Date:** October 2026  
**Repository:** https://github.com/bharath-kadali/devsecops-project  

---

## Slide 1: Project Overview & Motivation
### Title: CloudDesk — Enterprise IT Helpdesk & DevSecOps Platform
- **Problem Statement:** Modern IT organizations require scalable, resilient, and secure platforms to manage infrastructure incidents, access grants, and system anomalies without manual overhead.
- **Solution:** CloudDesk is a full-stack, cloud-native IT Helpdesk platform engineered with automated quality gates, security scanning, Infrastructure as Code, declarative Kubernetes orchestration, and comprehensive observability.
- **DevSecOps Mission:** Shift security left, automate validation in CI, manage infrastructure declaratively with Terraform, and achieve continuous GitOps delivery with ArgoCD on AWS EKS.

---

## Slide 2: Technology Stack & Core Tooling
### Title: End-to-End Modern Cloud-Native Stack
- **Application Layer:**
  - Frontend: React 18, Vite 6, Modern CSS with dark/light themes
  - Backend: FastAPI 0.115.6, Uvicorn, SQLAlchemy 2.0, Python 3.12
  - Persistence: PostgreSQL 16 Alpine with Alembic migrations
- **Quality & Security Layer:**
  - Testing: Pytest with 12 unit/integration tests and SQLite test DB
  - Container Security: Aqua Security Trivy (blocking on HIGH/CRITICAL)
- **Infrastructure & Platform Layer:**
  - Containers: Docker multi-stage builds (non-root `appuser` & `nginx-unprivileged`)
  - CI/CD: GitHub Actions with GitHub Container Registry (GHCR)
  - IaC: Terraform 1.7+ with AWS VPC and EKS modules
  - Orchestration: Kubernetes 1.31 with Helm 3 package management
  - GitOps: ArgoCD continuous reconciliation
  - Observability: Prometheus, Grafana, ServiceMonitor

---

## Slide 3: System Architecture
### Title: End-to-End DevSecOps Architecture
```text
[Developer] ---> [GitHub Repo] ---> [GitHub Actions CI]
                                         |
                                         +---> 1. Pytest (12 tests)
                                         +---> 2. Docker Multi-Stage Build
                                         +---> 3. Trivy Security Scan
                                         +---> 4. Push to GHCR (SHA tag)
                                         |
[Terraform] ---> Provisions AWS VPC + EKS Cluster (ap-south-1)
                                         |
[ArgoCD / Helm] <------------------------+
       |
       +---> [Kubernetes Namespace: clouddesk]
                 |
                 +---> Ingress (NGINX: / -> Frontend, /api -> Backend)
                 +---> Frontend Deployment (2 Replicas, Port 8080)
                 +---> Backend Deployment (2 Replicas, Port 8000)
                 +---> PostgreSQL StatefulSet + 5Gi PVC
                 +---> Horizontal Pod Autoscaler (2 - 6 Replicas)
                 |
[Prometheus & Grafana] <--- Scrapes /metrics via ServiceMonitor
```

---

## Slide 4: CI/CD Pipeline & Security Gates
### Title: Shifting Security Left with GitHub Actions & Trivy
- **Automated Gating:**
  - Pull requests and pushes to `main` trigger `.github/workflows/ci-cd.yml`.
  - **Job 1 (Test):** Pytest executes 12 tests against SQLite test database; build fails immediately if any test fails. Frontend build is validated via `npm ci && npm run build`.
  - **Job 2 (Build, Scan, Push):** Docker images built with immutable Git commit SHA tags (`clouddesk-backend:<sha>` and `clouddesk-frontend:<sha>`).
  - **Security Gate:** Trivy CLI scans both container images with `--exit-code 1 --severity HIGH,CRITICAL --ignore-unfixed`.
  - **Registry Push:** Only clean, verified images are published to GHCR.
- **Why SHA Tags Matter:** Prevents configuration drift and mutable deployment risks associated with the `:latest` tag.

---

## Slide 5: Infrastructure as Code (Terraform)
### Title: Reproducible Cloud Infrastructure on AWS
- **Modular Design:**
  - `terraform-aws-modules/vpc/aws`: 2 public subnets, 2 private subnets across `ap-south-1a` and `ap-south-1b`, single NAT gateway.
  - `terraform-aws-modules/eks/aws`: EKS 1.31 cluster with managed worker node group using `t3.medium` instances (min: 2, max: 4, desired: 2).
- **Quality & Safety:**
  - Multi-line HCL formatted with `terraform fmt`.
  - `terraform validate` passing without warnings.
  - `terraform.tfvars.example` provided for safe variable configuration without committing credentials.
  - Complete lifecycle management: from `terraform init` to clean `terraform destroy`.

---

## Slide 6: Kubernetes Orchestration & Helm Deployment
### Title: Cloud-Native Release Management with Helm
- **Helm Chart (`helm/clouddesk`):**
  - Parameterized `values.yaml` enabling environment-specific configurations.
  - Replicas: High availability with minimum 2 replicas each for frontend and backend.
  - Non-Root Pod Security: Backend runs as UID 10001; Frontend runs as UID 101 on port 8080.
  - Ingress: Configured for NGINX Ingress controller routing `/api` traffic to backend (port 8000) and `/` to frontend (port 80).
  - Scalability: Horizontal Pod Autoscaler (HPA) targeting 60% CPU utilization.
  - Smoke Testing: Ephemeral Kind cluster validation in CI pipeline.

---

## Slide 7: Observability & Monitoring
### Title: Full-Stack Visibility with Prometheus & Grafana
- **Metrics Instrumentation:**
  - `prometheus-fastapi-instrumentator` exposes native OpenMetrics on `/metrics`.
  - Tracks request count, duration, error rates, and system resource consumption.
- **Prometheus Operator & ServiceMonitor:**
  - Custom `ServiceMonitor` automatically discovers backend endpoints every 15 seconds.
  - Targets page verifies `clouddesk-backend` in `UP` state.
- **Grafana Visualization:**
  - Real-time dashboard visualizes HTTP throughput (`http_requests_total`), p95/p99 latency (`http_request_duration_seconds`), and pod CPU/memory utilization.

---

## Slide 8: Key Learnings & Future Enhancements
### Title: Capstone Reflection & Next Steps
- **Key Learnings:**
  - Designing security into container images from day one (unprivileged users, minimal base images) drastically reduces vulnerability remediation overhead.
  - Immutable SHA image tagging combined with GitOps ensures absolute reproducibility between git commits and running cluster workloads.
  - Separating configuration into Helm values and Terraform variables maintains clear boundaries between infrastructure and application lifecycle.
- **Future Enhancements:**
  - Migrate in-cluster PostgreSQL to an AWS RDS Aurora Serverless database for multi-AZ disaster recovery.
  - Integrate HashiCorp Vault / AWS Secrets Manager via External Secrets Operator.
  - Add synthetic load generation and automated canary rollouts via Argo Rollouts.
