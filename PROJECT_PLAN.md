# DevSecOps Capstone — Project Brief and Work Plan

**Source repo:** https://github.com/Nency-Ravaliya/devsecops-python (branch `main`, 12 commits, public, 3 forks)
**Reviewed at commit:** `bab00cc` (shallow clone)
**Review method:** static read of every file in the repo plus the rendered README and GRADING.md. Nothing was executed (no pytest, docker, helm or terraform runs), so items marked *verify* are suspected from reading and need a real command to confirm.

---

## 1. Read this first

1. **Hard deadline: Sunday 19 October 2026, 11:59 PM IST** (per `SUBMISSION.md`). Late penalty is 5 points per 24 hours. Submission is one public GitHub repo link via https://forms.gle/XWAP1vAumDJgAPM1A.
2. **The rubric forbids a plain clone of the reference project.** `GRADING.md` says a submission that is a direct clone of the TaskBoard reference without meaningful changes gets zero for all modules, and "the application domain must be your own". The repo as it stands is essentially the reference TaskBoard (the UI even hard-codes "Nensi Ravaliya" and "Good morning, Nensi"). The DevOps layer may keep the same architecture, but the app domain (entities, endpoints, UI copy, names) must change. **Confirm the chosen domain with the user before building** (see section 9).
3. **The repo is a half-adapted version of the reference.** The README describes the reference design (GHCR, Helm to EKS). The actual CI workflow, k8s manifests and some Helm templates diverge from it and contain defects. Section 5 lists them with file references.
4. **Never commit secrets.** No AWS keys, tokens or kubeconfigs in git. Graders reject submissions with secrets in history.
5. **AWS costs are the student's responsibility.** EKS and a NAT gateway bill by the hour. Always finish with `terraform destroy` and capture the output as evidence.

---

## 2. What the project is

TaskBoard: a small SaaS-style task manager used to demonstrate the full path from laptop to a monitored Kubernetes cluster.

| Layer | Technology |
|---|---|
| Frontend | React + Vite, single `src/main.jsx` (minified-style one-liners), `src/styles.css`, served by Nginx 1.27 |
| Backend | FastAPI 0.115.6, Uvicorn 0.34.0, SQLAlchemy 2.0.36, Pydantic Settings, Python 3.12 |
| Database | PostgreSQL 16 (alpine), Alembic 1.14.0 migrations (one migration: `0001_create_tasks`) |
| Metrics | `prometheus-fastapi-instrumentator` exposing `/metrics` |
| Tests | pytest 8.3.4 + httpx, SQLite test DB |
| Containers | Docker, Docker Compose |
| CI/CD | GitHub Actions, Trivy |
| IaC | Terraform with `terraform-aws-modules/vpc/aws` 5.8.1 and `terraform-aws-modules/eks/aws` 20.37.1, region `ap-south-1` |
| Orchestration | Kubernetes, Helm chart `helm/taskboard`, Ingress (nginx class), HPA |
| Observability | kube-prometheus-stack (Prometheus + Grafana) via `monitoring/prometheus-values.yaml`, ServiceMonitor |

### Intended flow (from the README)

```
Developer -> Git/GitHub -> GitHub Actions (pytest, frontend build, Docker build, Trivy, push to GHCR)
          -> Terraform (AWS VPC + EKS) -> Helm -> Frontend / Backend / PostgreSQL
          -> Prometheus -> Grafana
```

---

## 3. Repository map

```
.
├── README.md                    # reference README (808 lines) — must be rewritten for the student's own project
├── GRADING.md                   # 100-point rubric (see section 4)
├── SUBMISSION.md                # deadline + video requirements
├── ci-cd.yml                    # STRAY root copy of the reference workflow (GHCR + Helm). Does not run.
├── docker-compose.yml           # postgres:16-alpine, backend (8000), frontend (3000->80)
├── .github/workflows/ci-cd.yml  # the workflow that actually runs (differs from root copy)
├── backend/
│   ├── Dockerfile               # python:3.12-slim, non-root uid 10001, runs alembic then uvicorn
│   ├── app/{main,models,schemas,db,config}.py
│   ├── alembic/ (env.py, versions/0001_create_tasks.py), alembic.ini
│   ├── tests/test_api.py        # 3 tests
│   ├── pytest.ini               # pythonpath = .
│   ├── requirements.txt         # pinned
│   └── .env.example
├── frontend/
│   ├── Dockerfile               # multi-stage node:22-alpine -> nginx:1.27-alpine (runs as root)
│   ├── nginx.conf               # proxies /api/ and /health to http://backend:8000
│   ├── package.json             # deps pinned to "latest", no lockfile
│   └── src/{main.jsx,styles.css}, index.html, vite.config.js
├── helm/taskboard/              # Chart.yaml, values{,-dev,-prod}.yaml, 8 templates
├── k8s/                         # namespace.yaml, deployment.yaml, service.yaml (plain manifests used by CI Kind deploy)
├── monitoring/prometheus-values.yaml
├── terraform/                   # main.tf, variables.tf, outputs.tf, versions.tf, README.md, .gitignore
├── scripts/load-test.sh         # 500 curls against $URL
└── troubleshooting/             # broken-image.yaml, broken-service.yaml (deliberate failure labs)
```

Not present: `demo/` folder, any ArgoCD manifests, any Grafana dashboard JSON, `terraform.tfvars.example`, `package-lock.json`.

---

## 4. Grading rubric (100 points) and current status

Status is my static assessment of the repo as it stands. "At risk" means a rubric line is probably lost unless fixed.

| Module | Topic | Pts | Status | Main gap |
|---|---|---|---|---|
| M1 | App: frontend + backend + DB | 10 | Mostly there | Domain is the reference one; must be customized (section 1) |
| M2 | Testing | 10 | **At risk** | Only 3 tests; rubric needs at least 5 covering at least 3 endpoints |
| M3 | Git/GitHub | 5 | **At risk** | Root `.gitignore` has no `.venv` entry (rubric names it); `.DS_Store` files are committed; commit message quality unchecked (12 commits exist) |
| M4 | Docker | 10 | **At risk** | Frontend image runs as root; rubric requires non-root for images |
| M5 | CI/CD | 15 | **At risk** | Pushes to Docker Hub, not GHCR; also pushes `latest`; see section 5 |
| M6 | Trivy | 5 | **At risk** | Scan never fails the build (no `--exit-code 1`) |
| M7 | Terraform | 15 | **At risk** | Dense one-line HCL (*verify* parses); no `terraform.tfvars.example`; nothing proven applied |
| M8 | Kubernetes + Helm | 15 | **At risk** | Ingress points at wrong service name and port; frontend-to-backend proxy host does not exist in-cluster; deploy job doesn't use Helm or EKS |
| M9 | Prometheus + Grafana | 10 | Partial | Chart/values exist; nothing installed or evidenced; no dashboard |
| M10 | README + video + slides | 5 | **Missing** | README is the reference one; no `demo/` folder; no video; no deck; video must show ArgoCD, which is not set up |

### Rubric details the agent must satisfy (condensed from `GRADING.md`)

- **M1:** `/health` works; at least 4 REST endpoints (GET, POST, PUT, DELETE); at least one Alembic-managed table; frontend renders and calls the API; usable responsive UI.
- **M2:** `pytest` passes; at least 5 test cases across at least 3 endpoints; tests use a test DB or mock; `pytest.ini` or `conftest.py` present.
- **M3:** public repo; meaningful commit messages (not "update", "fix", "test"); `.gitignore` excludes `.env`, `__pycache__`, `node_modules`, `.venv`.
- **M4:** backend Dockerfile builds; frontend Dockerfile is multi-stage (Node build + Nginx runtime); images run as non-root; `docker compose up --build` starts frontend, backend and postgres.
- **M5:** workflow in `.github/workflows/`; triggers on push to `main`; pytest job fails the build on failure; frontend built in the pipeline; Docker images built for both; images pushed to **GHCR**; tags use the **Git commit SHA, not `latest`**.
- **M6:** Trivy scans both images in CI; pipeline fails on HIGH or CRITICAL; student can explain one CVE or a clean result; 2-3 sentence written explanation required.
- **M7:** valid HCL; `terraform init` clean; `terraform plan` non-empty and error-free; VPC with at least 2 public subnets; EKS with at least one node group; `terraform destroy` clean; `terraform.tfvars.example` present with no real credentials.
- **M8:** `k8s/namespace.yaml` applies; Helm chart with `Chart.yaml`, `values.yaml`, templates; `helm upgrade --install` succeeds; backend and frontend each run at least 2 replicas; ClusterIP Services; Ingress routes `/` to frontend and `/api` to backend; all pods Running.
- **M9:** `/metrics` returns Prometheus format; Prometheus installed and scraping the app; Grafana installed and reachable; at least one panel showing live app metrics.
- **M10:** root `README.md` with the full technical sections (purpose, architecture, tech stack, local setup, CI/CD, Terraform summary, K8s/Helm steps, observability, known issues); presentation video in `demo/` (**mandatory, zero for the module if missing**); slide deck PPT/PDF in `demo/` with at least 8 slides (overview, tech stack, architecture diagram, CI/CD flow, infrastructure, K8s setup, observability, key learnings).

---

## 5. Defects found (with locations)

### CI/CD — `.github/workflows/ci-cd.yml`

1. **Wrong registry.** Images are tagged and pushed as `nensiravaliya28/taskboard-*` to Docker Hub with `secrets.DOCKERHUB_TOKEN`. The rubric requires GHCR. The stray root `ci-cd.yml` shows the intended GHCR version using `${{ github.repository_owner }}`, `docker/login-action` with `GITHUB_TOKEN`, and `permissions: packages: write`.
2. **`latest` is pushed** alongside the SHA tag (push job). Rubric wants SHA tags, not `latest`.
3. **Trivy cannot fail the build.** The two `trivy image --severity HIGH,CRITICAL --ignore-unfixed` commands have no `--exit-code 1`, so the default exit code 0 applies. Also Trivy is apt-installed on every run. The root copy uses `aquasecurity/trivy-action@0.30.0` with `exit-code: '1'`.
4. **Images are built three times** (docker-build, image-scan, push) in separate jobs on separate runners. What is scanned is not byte-identical to what is pushed. Prefer one job: build, scan, push (as the reference does).
5. **Deploy job targets an ephemeral Kind cluster**, not EKS, and applies plain `k8s/*.yaml` (not Helm). It proves nothing about the real deployment.
6. `branches: main` is a scalar; the documented form is a list (`[main]`), which the root copy uses. Switch to the list to be safe.

### Plain k8s manifests — `k8s/`

7. `k8s/deployment.yaml` sets `DATABASE_URL=sqlite:///./taskboard.db` and runs the non-root image. `/app` is root-owned (created by `WORKDIR` before `USER 10001`), so SQLite file creation there likely fails and `alembic upgrade head` (run by the container CMD) would crash the pod. *Verify.*
8. Image names are hard-coded to the other author's Docker Hub account; `__IMAGE_TAG__` is substituted by `sed` in CI.
9. `k8s/` is still needed for `namespace.yaml` (rubric M8), but `deployment.yaml` and `service.yaml` should be retired or clearly marked as the CI smoke-test only.

### Helm chart — `helm/taskboard/`

10. **Ingress backend is wrong** (`templates/ingress.yaml` line 11): it targets service `taskboard-backend` on port **8080**. The actual backend Service is named `{{ release }}-taskboard-backend` (`_helpers.tpl`, so `taskboard-taskboard-backend` for release `taskboard`) and exposes port **8000**. `/api` traffic will not reach the backend.
11. **Frontend proxy host does not exist in-cluster.** `frontend/nginx.conf` proxies `/api/` and `/health` to `http://backend:8000`. That works in Compose (service name `backend`) but there is no Service named `backend` in the Helm chart. Calls made through the frontend Service (not through Ingress) will fail. Fix by making the upstream configurable (envsubst template) or adding a matching Service name.
12. **Inconsistent naming.** Backend resources use the `taskboard.fullname` helper; frontend, ingress, HPA, postgres and Services use hard-coded `taskboard-*` names. Works for one release, breaks if the release is renamed, and the HPA target uses the helper name.
13. **Image values are placeholders:** `ghcr.io/YOUR_ORG/...` in `values.yaml` and `values-prod.yaml`. The deploy step must override them (the root CI copy does with `--set`).
14. **Replica count:** default is 2 but `values-dev.yaml` sets 1 and disables HPA. The rubric requires at least 2 replicas each, so the EKS deployment must use default or prod values.
15. **Backend Deployment lacks `imagePullSecrets`**; the frontend one has it. Only matters if the images are private.
16. **Postgres runs in-cluster with a 5Gi PVC** and the password in plaintext in `values.yaml`. Acceptable for a lab; on EKS the PVC needs a working StorageClass and the **EBS CSI driver add-on**, which the Terraform does not install. *Verify.*
17. `values.yaml` has a `namespace:` key that no template uses; namespace comes from `-n` / `--create-namespace`.

### Frontend

18. **Runs as root.** `frontend/Dockerfile` ends on `nginx:1.27-alpine` with `EXPOSE 80`, no `USER`. Rubric M4 requires non-root images. The standard fix is `nginxinc/nginx-unprivileged` (listens on 8080), which then changes the Compose port mapping, Helm container port, probes, and Service targetPort.
19. `package.json` pins every dependency to `"latest"` and there is no lockfile, so builds are not reproducible and can break on a new major release. Pin versions and commit `package-lock.json`.
20. UI text hard-codes the reference author's name and the "DevOps Capstone" branding.

### Backend and tests

21. **Only 3 tests** (`test_health`, `test_root`, `test_create_task_validation`). The last is misnamed (it tests a successful create, not validation). Missing: list, get by id, 404, update, delete, stats, `/ready`, real validation failure (empty title, bad priority).
22. Test DB is a SQLite file `./test.db` set via env var before import; good, but remember it is gitignored via `*.db`.
23. `@app.on_event("startup")` is deprecated in current FastAPI (lifespan handlers are preferred). Cosmetic.
24. `allow_origins=["*"]` in CORS. Fine for a demo; note it in "known issues".
25. `load-test.sh` defaults to `http://taskboard.local/api/health`, but the backend only serves `/health` (not `/api/health`). Through the Ingress, `/api/health` would 404. Use `/health` or an `/api/tasks` URL.

### Terraform — `terraform/`

26. **Syntax risk:** `main.tf` and `versions.tf` pack many arguments onto single lines inside `module { ... }` and `terraform { ... }` blocks, and the node group object puts several attributes on one line without commas. Terraform's own parser restricts single-line blocks to one argument. A lenient third-party parser (python-hcl2) accepted the files, but Terraform was not available here, so run `terraform fmt` and `terraform validate`, and rewrite as multi-line HCL if they fail. Multi-line is also far more readable for graders.
27. No `terraform.tfvars.example` (explicit rubric item). `variable "environment"` is declared but unused.
28. Nothing installs the cluster add-ons the chart depends on: ingress-nginx controller, metrics-server (HPA), kube-prometheus-stack (ServiceMonitor CRD), EBS CSI driver (PVC). These steps have to be scripted or documented.

### Git hygiene — `.gitignore`

31. The root `.gitignore` covers `.env`, `__pycache__/`, `node_modules/`, `*.db`, `.terraform/` and tfstate, but **not `.venv`**, which the rubric lists explicitly (M3). Also `.DS_Store` files are committed (`./.DS_Store`, `backend/alembic/.DS_Store`): add `.DS_Store` to `.gitignore` and remove them from the index.

### Missing for the video / M10

29. **ArgoCD is required in the video but nowhere in the repo.** Need an ArgoCD install plus an `Application` manifest pointing at `helm/taskboard` on `main`.
30. No `demo/` folder, no deck, no recorded walkthrough, README not rewritten.

---

## 6. Work plan (ordered by risk and dependency)

Time budget is roughly 2.5 days, and AWS work has the longest lead time, so start it early and in parallel with code fixes.

### Phase 0 — Decisions and setup (do first, 30 min)
- Get from the user: app domain and entity model; whether an AWS account with permissions for VPC/EKS/IAM is available and which credentials method to use; whether the user will record the video themselves.
- Create the user's own repo (or fork) so the CI runs under their account and `github.repository_owner` is theirs.
- Run `terraform validate` early (install Terraform locally or in the agent's environment) to learn whether defect 26 is real.

### Phase 0b — Git hygiene (M3, 10 min)
- Add `.venv/` and `.DS_Store` to `.gitignore`; `git rm --cached` the committed `.DS_Store` files; make sure all later commits have meaningful messages.

### Phase 1 — Application and tests (M1, M2)
1. Rename the domain: models, schema, endpoints, Alembic migration, UI copy, sidebar/user labels, activity feed text. Keep at least 4 REST endpoints covering GET, POST, PUT, DELETE, plus `/health`, `/ready`, `/metrics`.
2. If the model changes, add a **new** Alembic migration (or regenerate `0001`), and confirm `alembic upgrade head` works on a fresh Postgres.
3. Expand tests to at least 8, covering list, create, get, 404, update, delete, stats, `/ready`, and a validation failure. Keep the SQLite test DB. Rename `test_create_task_validation` accurately.
4. **Acceptance:** `cd backend && pytest -v` all green; save terminal screenshot.

### Phase 2 — Docker (M4)
1. Make the frontend run as non-root (nginx-unprivileged on 8080, or equivalent). Update `docker-compose.yml` (3000 -> 8080), Helm container port, probes and Service targetPort together.
2. Make the Nginx upstream configurable so it works in both Compose (`backend`) and Kubernetes (defect 11).
3. Pin frontend dependency versions and commit the lockfile; use `npm ci` in the Dockerfile and CI.
4. Optionally drop pytest/httpx from the production image (split requirements).
5. **Acceptance:** `docker compose up --build` starts all three services; UI loads at http://localhost:3000; `docker run --rm <img> id` shows a non-root uid for both images. Capture screenshots.

### Phase 3 — CI/CD and security (M5, M6)
1. Rewrite `.github/workflows/ci-cd.yml` along the lines of the reference root `ci-cd.yml`: jobs `test` -> `build-scan-push` -> `deploy`.
2. Use GHCR (`ghcr.io/${{ github.repository_owner }}/<name>:${{ github.sha }}`), `permissions: contents: read, packages: write`, `GITHUB_TOKEN` login. **Remove the `latest` tag.**
3. Trivy via `aquasecurity/trivy-action` on both images with `severity: HIGH,CRITICAL`, `exit-code: '1'`, `ignore-unfixed: true`. Build once, scan that image, push the same image.
4. Keep pytest as a failing gate and the frontend build step. Use `branches: [main]`.
5. Decide the deploy job's target (see Phase 5). Never leave a job pointing at the other author's Docker Hub.
6. Delete the stray root `ci-cd.yml` (or move it out) to avoid confusion.
7. Write the 2-3 sentence Trivy explanation required by M6, based on a real run.
8. **Acceptance:** a green run on `main`, GHCR package page showing SHA tags for both images, Trivy output captured. Also verify the gate: temporarily break a test and confirm the pipeline stops.

### Phase 4 — Terraform (M7)
1. Reformat `main.tf` and `versions.tf` into multi-line HCL; run `terraform fmt -recursive` and `terraform validate`.
2. Add `terraform.tfvars.example` (region, cluster name, environment; no credentials). Use the `environment` variable in tags or remove it.
3. Consider adding the EKS add-ons the chart needs (EBS CSI driver add-on with its IAM role) or document the extra step.
4. `terraform init && terraform plan` (capture output), then `terraform apply`. Update kubeconfig: `aws eks update-kubeconfig --region ap-south-1 --name taskboard-eks`.
5. Capture AWS Console screenshots (VPC + EKS in `ap-south-1`).
6. **Do not destroy until Phases 5-7 and the video are done**, then `terraform destroy` and capture the output.

### Phase 5 — Kubernetes and Helm on EKS (M8)
1. Install cluster add-ons: ingress-nginx, metrics-server, kube-prometheus-stack (Phase 6).
2. Fix Helm defects 10-17 (ingress service name/port, consistent naming through the helper, image values, replica defaults, namespace handling, secrets handling).
3. `kubectl apply -f k8s/namespace.yaml`, then `helm upgrade --install taskboard ./helm/taskboard -n taskboard --create-namespace --set backend.image=... --set backend.tag=<sha> --set frontend.image=... --set frontend.tag=<sha>`.
4. Verify at least 2 replicas each, all pods Running, ClusterIP Services, Ingress routing `/` -> frontend and `/api` -> backend, app reachable through the Ingress hostname or LoadBalancer address.
5. Decide how CI deploys: either (a) GitHub Actions runs `helm upgrade --install` against EKS using a kubeconfig secret (never committed), or (b) ArgoCD does the deploy from git (Phase 7) and CI only builds/pushes and updates the image tag. Option (b) matches the video's GitOps requirement.
6. Optional exercise: run the two troubleshooting manifests and the load test (`URL=.../health ./scripts/load-test.sh`) to show HPA behaviour. Note that light curl traffic may not move CPU enough to scale.
7. **Acceptance screenshots:** `kubectl get pods -n taskboard`, `kubectl get svc -n taskboard`, `helm list -n taskboard`, browser through the Ingress.

### Phase 6 — Observability (M9)
1. `helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack -n monitoring --create-namespace -f monitoring/prometheus-values.yaml` (the release name `kube-prometheus-stack` matters: the ServiceMonitor carries `release: kube-prometheus-stack`).
2. Confirm the Prometheus Targets page shows the backend as `UP`; fix ServiceMonitor selector, port name (`http`) or namespace selectors if not.
3. Open Grafana (port-forward or Ingress), build a dashboard with at least one live panel (for example request rate or latency from `http_requests_total` / `http_request_duration_seconds` produced by the instrumentator). Export the dashboard JSON into `monitoring/` for reproducibility.
4. **Acceptance screenshots:** `curl <backend>/metrics`, Prometheus Targets page (UP), populated Grafana panel.

### Phase 7 — ArgoCD (video requirement)
1. Install ArgoCD in the cluster; add an `Application` manifest (store it in the repo, for example `argocd/application.yaml`) targeting `helm/taskboard` on `main`, destination namespace `taskboard`, automated sync.
2. Show a git change flowing through to a synced app.

### Phase 8 — Documentation and demo (M10)
1. Rewrite the root `README.md` for the student's own project with: description and purpose, architecture diagram, tech stack, local setup (`docker compose up`), CI/CD description, Terraform summary, Kubernetes/Helm steps, observability setup, known issues and limitations.
2. Create `demo/` with the slide deck (at least 8 slides, covering the topics in section 4) and the MP4 walkthrough.
3. Video order (from `SUBMISSION.md`): slides first; then live codebase tour; CI/CD (trigger a push and show the run completing); Terraform plan plus AWS Console proof; ArgoCD synced app; `kubectl get pods`, services, ingress; Prometheus Targets `UP`; Grafana dashboard.
4. Videos can be large; if the file exceeds GitHub's per-file limit (100 MB), use a release asset or Git LFS as `GRADING.md` allows ("under a `demo/` folder or as a release asset").

### Phase 9 — Final verification and submission
- Walk the submission checklist (section 8). Confirm no secrets in history (`git log -p | grep -i "AKIA\|secret"` style check, or a scanner such as gitleaks).
- Run `terraform destroy` and capture the output. Confirm in the AWS Console that nothing is left running.
- Submit the repo URL through the form before the deadline.

---

## 7. Local command reference

```bash
# Full local stack
docker compose up --build            # UI http://localhost:3000, API http://localhost:8000/docs
docker compose down -v               # also removes DB volume

# Backend without Docker
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL='postgresql+psycopg://taskboard:taskboard@localhost:5432/taskboard'
alembic upgrade head
uvicorn app.main:app --reload --port 8000
pytest -v

# Images
docker build -t taskboard-backend:local ./backend
docker build -t taskboard-frontend:local ./frontend

# Terraform
cd terraform && terraform init && terraform fmt -recursive && terraform validate
terraform plan && terraform apply
aws eks update-kubeconfig --region ap-south-1 --name taskboard-eks
terraform destroy

# Kubernetes / Helm
kubectl apply -f k8s/namespace.yaml
helm upgrade --install taskboard ./helm/taskboard -n taskboard --create-namespace
helm list -n taskboard
kubectl get pods,svc,ingress,hpa -n taskboard
```

### API surface (current)

```
GET    /                      service info
GET    /health                liveness  -> {"status":"UP"}
GET    /ready                 readiness (queries DB) -> {"status":"READY"}
GET    /metrics               Prometheus metrics
GET    /api/tasks             list (newest first)
GET    /api/tasks/stats       {total, todo, inProgress, done}
GET    /api/tasks/{id}
POST   /api/tasks             201; fields: title(1-200), description, priority LOW|MEDIUM|HIGH, status TODO|IN_PROGRESS|DONE, assignee
PUT    /api/tasks/{id}        partial update (exclude_unset)
DELETE /api/tasks/{id}        204
```

Data model `tasks`: `id`, `title`, `description`, `priority`, `status`, `assignee`, `created_at` (timestamptz). Config: `DATABASE_URL` env var (default points to local Postgres).

---

## 8. Submission checklist (from `GRADING.md`)

```
Application   [ ] repo URL  [ ] runs via docker compose up --build  [ ] 4+ REST endpoints  [ ] Alembic migration
Testing       [ ] pytest passes (screenshot)  [ ] 5+ tests
Docker        [ ] backend builds  [ ] frontend multi-stage  [ ] non-root in BOTH Dockerfiles
CI/CD         [ ] workflow present  [ ] runs on push to main  [ ] pytest in pipeline  [ ] GHCR images with SHA tags
Security      [ ] Trivy in pipeline (fails on HIGH/CRITICAL)  [ ] no secrets in git
Terraform     [ ] plan output  [ ] VPC + EKS screenshot  [ ] destroy output  [ ] terraform.tfvars.example
K8s + Helm    [ ] kubectl get pods all Running  [ ] helm list  [ ] app reachable via Ingress
Observability [ ] /metrics screenshot  [ ] Prometheus Targets UP  [ ] Grafana dashboard
Docs          [ ] README with all sections  [ ] demo/ video (MANDATORY)  [ ] demo/ deck PPT or PDF (MANDATORY)
Video extras  [ ] ArgoCD synced app shown
```

Required evidence screenshots: running app, `pytest -v`, commit history (10+ commits), `docker compose up`, GitHub Actions green run URL, GHCR package page, Trivy output, `terraform plan`, AWS Console (VPC + EKS), `terraform destroy`, `kubectl get pods/svc`, `helm list`, app via Ingress, `/metrics`, Prometheus Targets, Grafana panel.

---

## 9. Open questions to resolve with the user before or during the work

1. **What application domain should replace the reference TaskBoard** (CRM, inventory, clinic, helpdesk, and so on), and what are the entities? This decides the model, migration, endpoints and UI copy.
2. **AWS access:** is there an account and IAM user/role that can create VPC, EKS, NAT, IAM roles? How should credentials be supplied to the agent without being committed?
3. **Deploy path:** should GitHub Actions deploy to EKS directly, or should ArgoCD handle deployment from git? (Plan assumes ArgoCD, because the video requires it.)
4. **Registry visibility:** keep GHCR packages public (simplest, no pull secrets) or private (needs `imagePullSecrets` on both Deployments)?
5. **Video and slides:** will the user record the video and build the deck, or should the agent generate the deck and a recording script? The video itself cannot be produced by the agent.
6. **Database on EKS:** keep in-cluster Postgres with a PVC (current design, needs EBS CSI) or use RDS? The README says either is acceptable for the course; in-cluster is the lower-effort path.

---

## 10. Guardrails for the agent

- Do not run any `terraform apply` or other cost-incurring AWS action without explicit user confirmation, and always plan a `terraform destroy` at the end.
- Do not commit credentials, kubeconfigs, `.tfstate`, `.env` files, or tokens. Use GitHub Actions secrets.
- Write meaningful commit messages (the rubric penalizes "update", "fix", "test") and keep at least 10 commits in history.
- Treat all *verify* items as hypotheses until confirmed by running the relevant command.
- Keep changes scoped to what the rubric needs; do not redesign the architecture.
