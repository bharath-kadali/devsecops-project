# CloudDesk Capstone — Video Presentation & Walkthrough Guide

Use this script and checklist to record your final capstone presentation video (MP4) for **Module 10**.

**Target Duration:** 8 to 15 minutes  
**Format:** Screen recording with voiceover (Loom, OBS Studio, or Zoom)  
**Submission:** Save the video as `demo/walkthrough.mp4` or attach as a GitHub Release asset if file size exceeds 100MB.

---

## Recording Order & Script Checklist

### Part 1: Slide Presentation (2–3 minutes)
1. Open [demo/SLIDES.md](file:///demo/SLIDES.md) (or converted PPT/PDF).
2. **Slide 1:** Introduce yourself (Bharath Kadali), the project title (**CloudDesk: Enterprise IT Helpdesk & DevSecOps Platform**), and the project motivation.
3. **Slide 2:** Walk through the modern tech stack (FastAPI, React 18, Docker, GitHub Actions, Trivy, Terraform, EKS, Helm, ArgoCD, Prometheus, Grafana).
4. **Slide 3:** Explain the end-to-end architecture diagram showing the journey from git push to monitored cluster.
5. **Slide 4:** Explain the CI/CD pipeline and why shifting security left with Pytest and Trivy prevents vulnerable images from reaching production.
6. **Slide 5:** Highlight Terraform IaC design for AWS VPC and EKS.
7. **Slide 6:** Explain Kubernetes deployment using Helm, replica scaling, and non-root security.
8. **Slide 7:** Describe the observability architecture with Prometheus ServiceMonitor and Grafana.
9. **Slide 8:** Summarize key learnings and future production enhancements.

---

### Part 2: Codebase Tour (2 minutes)
1. **Repository Structure:**
   - Show `backend/` (FastAPI, `models.py`, `schemas.py`, `main.py`, Alembic migration).
   - Show `frontend/` (React UI, `main.jsx`, `styles.css`, `nginx.conf`).
   - Show `Dockerfile` in both directories: highlight non-root user `10001` in backend and `nginx-unprivileged` (port 8080) in frontend.
   - Show `docker-compose.yml` with healthy postgres check.
2. **Pytest Suite:**
   - In terminal, run:
     ```bash
     cd backend && pytest -v
     ```
   - Show all 12 test cases passing cleanly in ~2 seconds.

---

### Part 3: CI/CD Pipeline & Security Scan (2 minutes)
1. Open your GitHub Repository on your browser:
   - Go to **Actions** tab.
   - Show the green run for **CloudDesk DevSecOps CI/CD**.
   - Click into the run:
     - Show **Unit Tests & Build Verification** passing.
     - Show **Container Build, Security Scan & GHCR Push**: expand the **Trivy scan** logs showing 0 HIGH/CRITICAL vulnerabilities.
     - Point out the immutable Git commit SHA tag on both images.
2. Open **Packages** tab on GitHub:
   - Show published packages: `clouddesk-backend` and `clouddesk-frontend` tagged with the commit SHA (no `latest`).

---

### Part 4: Terraform Infrastructure (1–2 minutes)
1. In terminal, navigate to `terraform/`:
   ```bash
   terraform fmt -check
   terraform validate
   ```
   Show `Success! The configuration is valid.`
2. Show the AWS Console (or captured screenshot):
   - **VPC Console:** Show `clouddesk-eks-vpc` with public and private subnets in `ap-south-1`.
   - **EKS Console:** Show `clouddesk-eks` cluster in `Active` status with managed node group.

---

### Part 5: ArgoCD GitOps & Kubernetes Rollout (2 minutes)
1. **ArgoCD Dashboard:**
   - Show application `clouddesk` in `Synced` and `Healthy` status.
   - Show tree hierarchy: Application -> Service -> Deployment -> Pods.
2. **Terminal Verification:**
   ```bash
   kubectl get pods -n clouddesk -o wide
   kubectl get svc -n clouddesk
   kubectl get ingress -n clouddesk
   helm list -n clouddesk
   ```
   - Verify 2 backend replicas and 2 frontend replicas in `Running` state.
   - Point out ClusterIP services and ingress routing.

---

### Part 6: Live Application Walkthrough (1–2 minutes)
1. Open the CloudDesk frontend in browser (`http://localhost:3000` or ingress host):
   - Show the dashboard with real-time counters: Total Tickets, Open Issues, In Progress, Resolved.
   - Demonstrate creating a new support ticket:
     - Title: "High CPU threshold alert on ingress controller"
     - Category: `INFRASTRUCTURE`
     - Priority: `HIGH`
     - Click **Submit Support Ticket**.
   - Show ticket appearing in table and counters incrementing.
   - Click **↻ Status** to transition the ticket from `OPEN` -> `IN_PROGRESS` -> `RESOLVED`.
   - Show the interactive status filter tabs (`ALL`, `OPEN`, `IN_PROGRESS`, `RESOLVED`).

---

### Part 7: Observability (Prometheus & Grafana) (1–2 minutes)
1. **Prometheus:**
   - Show `curl http://localhost:8000/metrics` or Prometheus Targets UI at `http://localhost:9090/targets`.
   - Highlight `clouddesk-backend` target in `UP` state (scraped via ServiceMonitor).
2. **Grafana Dashboard:**
   - Open Grafana dashboard at `http://localhost:3000` (or Grafana port).
   - Show live panels visualizing HTTP request volume and latency percentiles.

---

### Part 8: Infrastructure Teardown & Conclusion (30 seconds)
1. Show terminal output of `terraform destroy` cleanly tearing down AWS resources:
   ```bash
   terraform destroy -auto-approve
   ```
2. State that all AWS resources have been deleted to avoid billing.
3. Conclude the video with closing remarks.
