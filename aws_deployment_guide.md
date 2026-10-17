# 🚀 CloudDesk — AWS Deployment Guide

## How It Worked Without AWS Credentials

Before diving into the AWS procedure, here's why everything worked without credentials:

| Component | Why No AWS Needed |
|---|---|
| **Local Demo** (`docker compose up`) | Runs entirely on your machine — PostgreSQL, backend, frontend all in Docker containers |
| **CI/CD Pipeline** (GitHub Actions) | Uses GHCR (GitHub Container Registry) + Kind (ephemeral K8s cluster in CI) — no cloud infra needed |
| **Terraform** | Only `terraform validate` was run (syntax check). No `terraform apply` = no AWS resources created |
| **Helm/ArgoCD configs** | These are just YAML manifests sitting in the repo — they don't do anything until applied to a real cluster |

**In short:** The entire project was demonstrated using Docker Compose locally and GitHub Actions in CI. AWS EKS is the *production target*, but the demo never actually provisioned it.

---

## Running on Your AWS Account — Step by Step

### Prerequisites

Install these tools on your Windows machine:

| Tool | Install Command / Link |
|---|---|
| **AWS CLI v2** | [Download MSI Installer](https://awscli.amazonaws.com/AWSCLIV2.msi) |
| **Terraform ≥ 1.7** | `winget install Hashicorp.Terraform` or [download](https://developer.hashicorp.com/terraform/install) |
| **kubectl** | `winget install Kubernetes.kubectl` |
| **Helm 3** | `winget install Helm.Helm` |
| **Docker Desktop** | Already installed ✅ |

### Step 1 — Configure AWS Credentials

```powershell
# Run this and enter your Access Key ID, Secret Access Key, and region
aws configure
```

You'll be prompted for:
```
AWS Access Key ID:     AKIA...........
AWS Secret Access Key: wJal...........
Default region name:   ap-south-1
Default output format: json
```

> [!IMPORTANT]
> Your IAM user/role needs these permissions:
> - **AmazonEKSClusterPolicy** — EKS cluster management
> - **AmazonVPCFullAccess** — VPC, subnets, NAT gateway creation
> - **AmazonEC2FullAccess** — EC2 instances for worker nodes
> - **IAMFullAccess** — Creating EKS service roles
> - **AmazonEKSWorkerNodePolicy** — Worker node registration
>
> For a capstone/dev project, the simplest approach is to use an IAM user with **AdministratorAccess** policy attached.

Verify credentials work:
```powershell
aws sts get-caller-identity
```
You should see your account ID, ARN, and user ID.

---

### Step 2 — Provision AWS Infrastructure with Terraform

```powershell
cd terraform

# Copy the example variables file
cp terraform.tfvars.example terraform.tfvars

# Edit if needed (defaults are fine for ap-south-1):
# aws_region   = "ap-south-1"
# cluster_name = "clouddesk-eks"
# environment  = "dev"

# Initialize Terraform (downloads AWS provider + modules)
terraform init

# Preview what will be created (VPC + EKS + Node Groups)
terraform plan

# Create the infrastructure (~15-20 minutes)
terraform apply -auto-approve
```

> [!WARNING]
> **AWS Cost Alert!** This creates:
> - 1 VPC with NAT Gateway (~$0.045/hr + data transfer)
> - 1 EKS Cluster (~$0.10/hr = ~$73/month)
> - 2× `t3.medium` EC2 instances (~$0.0416/hr each = ~$60/month)
>
> **Estimated total: ~$5-7/day.** Always run `terraform destroy` when done!

---

### Step 3 — Connect kubectl to Your EKS Cluster

```powershell
# This updates your ~/.kube/config automatically
aws eks update-kubeconfig --region ap-south-1 --name clouddesk-eks

# Verify connection
kubectl get nodes
# Should show 2 worker nodes in "Ready" state
```

---

### Step 4 — Push Container Images to GHCR

The CI/CD pipeline handles this automatically on every push to `main`. But if you want to push manually:

```powershell
# Login to GitHub Container Registry
echo YOUR_GITHUB_PAT | docker login ghcr.io -u bharath-kadali --password-stdin

# Build and tag images
docker build -t ghcr.io/bharath-kadali/clouddesk-backend:latest ./backend
docker build -t ghcr.io/bharath-kadali/clouddesk-frontend:latest ./frontend

# Push to GHCR
docker push ghcr.io/bharath-kadali/clouddesk-backend:latest
docker push ghcr.io/bharath-kadali/clouddesk-frontend:latest
```

Or simply push code to `main` and let GitHub Actions build, scan, and push automatically.

---

### Step 5 — Deploy to EKS with Helm

```powershell
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Deploy the application
helm upgrade --install clouddesk ./helm/clouddesk `
  --namespace clouddesk `
  --set backend.image=ghcr.io/bharath-kadali/clouddesk-backend `
  --set backend.tag=latest `
  --set frontend.image=ghcr.io/bharath-kadali/clouddesk-frontend `
  --set frontend.tag=latest

# Verify everything is running
kubectl get pods,svc,ingress,hpa -n clouddesk
```

---

### Step 6 — Install NGINX Ingress Controller (for external access)

```powershell
# Install NGINX Ingress Controller
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install ingress-nginx ingress-nginx/ingress-nginx `
  --namespace ingress-nginx `
  --create-namespace

# Get the external Load Balancer URL (wait ~2 minutes for AWS to provision)
kubectl get svc -n ingress-nginx
# Look for the EXTERNAL-IP column — it'll be an AWS ELB DNS name
```

Access your app at the ELB DNS name shown (e.g., `a1b2c3d4e5.ap-south-1.elb.amazonaws.com`).

---

### Step 7 — (Optional) Deploy ArgoCD for GitOps

```powershell
# Install ArgoCD
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for pods
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=argocd-server -n argocd --timeout=300s

# Get admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | ForEach-Object { [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($_)) }

# Port-forward ArgoCD UI
kubectl port-forward svc/argocd-server -n argocd 8443:443

# Access at: https://localhost:8443 (user: admin, password: from above)

# Apply the CloudDesk ArgoCD application
kubectl apply -f argocd/application.yaml
```

---

### Step 8 — (Optional) Deploy Monitoring Stack

```powershell
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack `
  --namespace monitoring `
  --create-namespace `
  --values monitoring/prometheus-values.yaml

# Port-forward Grafana
kubectl port-forward svc/kube-prometheus-stack-grafana -n monitoring 3001:80
# Access at: http://localhost:3001 (user: admin, password: prom-operator)
```

---

## 🛑 IMPORTANT — Teardown When Done

```powershell
# 1. Uninstall Helm releases
helm uninstall clouddesk -n clouddesk
helm uninstall ingress-nginx -n ingress-nginx
helm uninstall kube-prometheus-stack -n monitoring  # if installed

# 2. Destroy all AWS infrastructure
cd terraform
terraform destroy -auto-approve
```

> [!CAUTION]
> **Always run `terraform destroy` when you're done!** Leaving EKS + EC2 running will cost **~$5-7/day** (~$150-200/month).

---

## Quick Reference — What Runs Where

| Scenario | Command | AWS Needed? | Cost |
|---|---|---|---|
| **Local demo** | `docker compose up --build` | ❌ No | Free |
| **CI/CD pipeline** | Push to `main` on GitHub | ❌ No (uses GHCR + Kind) | Free |
| **Production on EKS** | `terraform apply` + `helm install` | ✅ Yes | ~$5-7/day |
