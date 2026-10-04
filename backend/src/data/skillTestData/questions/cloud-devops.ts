import type { QuestionBank } from '../types';

// 14 cloud/DevOps skills × 10 questions each.
export const BANK: QuestionBank = {
  // ── aws ────────────────────────────────────────────────────────────────────
  aws: [
    ['Core Services', 'beginner', 'single_choice', 'What does AWS stand for?', ['Amazon Web Services', 'Advanced Web Storage', 'Amazon Windows Server', 'Automated Web Software'], [0], 'AWS is Amazon’s cloud computing platform.'],
    ['Core Services', 'beginner', 'single_choice', 'Which region concept keeps data within a chosen geography?', ['Availability Zone only', 'AWS Regions', 'Edge locations only', 'VPC peering'], [1], 'Regions are separate geographic areas; AZs are zones inside them.'],
    ['Compute & Storage', 'beginner', 'single_choice', 'EC2 is best described as:', ['Managed Kubernetes', 'Virtual servers in the cloud', 'Object storage', 'A database'], [1], 'EC2 provides resizable virtual machines (instances).'],
    ['Compute & Storage', 'beginner', 'single_choice', 'S3 stores data as:', ['Block volumes', 'Objects in buckets', 'Filesystems only', 'Queues'], [1], 'S3 is object storage: buckets contain key-value objects.'],
    ['Compute & Storage', 'intermediate', 'single_choice', 'EBS volumes are most similar to:', ['Network hard drives attached to one instance', 'S3 buckets', 'CDNs', 'Snapshots only'], [0], 'EBS = persistent block storage for EC2 (mountable, detachable).'],
    ['Networking', 'intermediate', 'single_choice', 'A VPC is:', ['A private virtual network in the cloud', 'A CDN', 'An IAM group', 'A monitoring tool'], [0], 'VPC defines subnets, route tables, gateways and security boundaries.'],
    ['Networking', 'intermediate', 'single_choice', 'Security groups differ from NACLs by being:', ['Stateless at subnet level', 'Stateful and attached to instances', 'Global only', 'Read-only'], [1], 'Security groups are stateful instance firewalls; NACLs are stateless subnet rules.'],
    ['Security & IAM', 'intermediate', 'single_choice', 'IAM policies grant:', ['Physical access', 'Permissions to actions/resources', 'Billing credits', 'Region migration'], [1], 'Policies are JSON documents attached to users, groups or roles.'],
    ['Security & IAM', 'intermediate', 'single_choice', 'What is the recommended practice for programmatic access?', ['Long-term access keys on laptops', 'Temporary credentials via IAM roles', 'Root account keys', 'Shared passwords'], [1], 'Roles issue short-lived STS credentials — best practice.'],
    ['Serverless', 'intermediate', 'single_choice', 'AWS Lambda lets you run:', ['Whole VMs only', 'Functions without managing servers', 'Only SQL queries', 'Containers only'], [1], 'Event-driven functions billed per execution time.'],
  ],

  // ── azure ──────────────────────────────────────────────────────────────────
  azure: [
    ['Core Services', 'beginner', 'single_choice', 'Microsoft Azure is:', ['A desktop OS', 'Microsoft’s cloud platform', 'An email service', 'A database engine'], [1], 'Azure offers compute, storage, networking and AI services.'],
    ['Core Services', 'beginner', 'single_choice', 'Azure regions are:', ['Single data centers', 'Geographic areas hosting one or more datacenters', 'Virtual networks', 'VM sizes'], [1], 'Choose regions for latency, compliance and availability.'],
    ['Compute & Storage', 'beginner', 'single_choice', 'Azure Virtual Machines provide:', ['SaaS only', 'On-demand IaaS virtual machines', 'PaaS web apps only', 'DNS hosting'], [1], 'VMs are resizable servers you fully manage.'],
    ['Compute & Storage', 'intermediate', 'single_choice', 'Azure Blob Storage is for:', ['Block/object storage for unstructured data', 'Relational queries', 'Email', 'Kubernetes only'], [0], 'Blobs suit images, videos, backups and static website assets.'],
    ['Compute & Storage', 'intermediate', 'single_choice', 'Azure App Service is:', ['An IaaS VM', 'A managed PaaS for web/mobile apps', 'A VPN', 'A file share'], [1], 'App Service handles scaling, TLS and deployment slots.'],
    ['Networking', 'intermediate', 'single_choice', 'Azure Virtual Network provides:', ['Social networking', 'Isolated network space for Azure resources', 'CDN caching', 'Load testing'], [1], 'VNets host subnets and connect on-premises via VPN/ExpressRoute.'],
    ['Networking', 'advanced', 'single_choice', 'Azure Blob/URL with CDN mainly improves:', ['Security only', 'Latency by caching content at edge locations', 'Billing', 'VM CPU'], [1], 'CDNs serve static content from locations near users.'],
    ['Identity & Security', 'intermediate', 'single_choice', 'Azure AD (Entra ID) is used for:', ['File storage', 'Identity and access management (SSO, MFA)', 'VM hosting', 'Monitoring logs only'], [1], 'It authenticates users and apps across Microsoft services.'],
    ['Identity & Security', 'intermediate', 'single_choice', 'Just-In-Time VM access reduces risk by:', ['Deleting VMs', 'Opening RDP/SSH only when needed for a time window', 'Disabling passwords', 'Auto-updating only'], [1], 'Reduces exposure of management ports to the internet.'],
    ['DevOps on Azure', 'beginner', 'single_choice', 'Azure DevOps provides:', ['Only source control', 'Repos, Pipelines, Boards, Test Plans and Artifacts', 'Only billing', 'Only monitoring'], [1], 'An end-to-end ALM suite (Git repos + CI/CD + boards).'],
  ],

  // ── gcp ────────────────────────────────────────────────────────────────────
  gcp: [
    ['Core Services', 'beginner', 'single_choice', 'Google Cloud Platform (GCP) is:', ['Google’s cloud computing services', 'A browser', 'An email app', 'A JavaScript library'], [0], 'GCP offers compute, storage, data analytics and AI services.'],
    ['Core Services', 'beginner', 'single_choice', 'A GCP project provides:', ['A billing and permission boundary for resources', 'A single VM', 'A CDN cache', 'A domain name'], [0], 'Resources belong to projects; IAM policies attach at project level.'],
    ['Compute & Storage', 'beginner', 'single_choice', 'Compute Engine provides:', ['Managed Kubernetes only', 'Scalable virtual machines', 'Big data only', 'Email'], [1], 'GCE = Google’s IaaS VM offering.'],
    ['Compute & Storage', 'intermediate', 'single_choice', 'Cloud Storage unified buckets support:', ['Only Nearline', 'Multiple storage classes (Standard, Nearline, Coldline, Archive)', 'Only multi-regional', 'No lifecycle rules'], [1], 'Lifecycle rules auto-transition objects to cheaper classes.'],
    ['Compute & Storage', 'intermediate', 'single_choice', 'App Engine is:', ['A VM type', 'A fully managed serverless application platform', 'A database', 'A storage class'], [1], 'Deploy code without managing infrastructure.'],
    ['Networking', 'intermediate', 'single_choice', 'VPC on GCP can be:', ['Global across regions with subnets per region', 'Locked to one zone only', 'Non-routable', 'Manual only'], [0], 'GCP VPCs are global; subnets are regional.'],
    ['Networking', 'advanced', 'single_choice', 'Cloud Load Balancing provides:', ['A single anycast IP distributing traffic globally', 'Local-only round robin', 'DNS only', 'Firewall only'], [0], 'Global software-defined LB with autoscaling backends.'],
    ['BigQuery & Data', 'intermediate', 'single_choice', 'BigQuery is best for:', ['OLTP row updates', 'Serverless data warehousing and fast SQL analytics', 'Object storage', 'VM hosting'], [1], 'Columnar, petabyte-scale analytics with streaming ingestion.'],
    ['IAM & Security', 'intermediate', 'single_choice', 'Service accounts are used to:', ['Log in humans', 'Authenticate applications/workloads to GCP APIs', 'Store secrets only', 'Route traffic'], [1], 'Workloads authenticate with service-account keys or workload identity.'],
    ['IAM & Security', 'beginner', 'single_choice', 'Organization policy primarily:', ['Sets constraints on how resources can be used across projects', 'Builds VMs', 'Routes DNS', 'Backs up disks'], [0], 'Central guardrails e.g. disabling service-account key creation.'],
  ],

  // ── docker ─────────────────────────────────────────────────────────────────
  docker: [
    ['Images & Containers', 'beginner', 'single_choice', 'A Docker image is:', ['A running process', 'A read-only template with app + dependencies', 'A VM snapshot', 'A registry'], [1], 'Containers are runnable instances of images.'],
    ['Images & Containers', 'beginner', 'single_choice', 'A container differs from a VM mainly by:', ['Having its own full OS kernel/heavy overhead', 'Sharing the host OS kernel and being lightweight', 'Requiring hypervisor', 'Being slower to start'], [1], 'Containers are isolated processes, not full machines.'],
    ['Images & Containers', 'intermediate', 'single_choice', 'Which command lists running containers?', ['docker ps', 'docker ls', 'docker containers-show', 'docker run --list'], [0], 'docker ps shows running containers; -a includes stopped.'],
    ['Dockerfile', 'beginner', 'single_choice', 'What does a Dockerfile contain?', ['Binary executable', 'Instructions to build an image', 'Only ports', 'Runtime metrics'], [1], 'FROM, RUN, COPY, CMD etc. define image layers.'],
    ['Dockerfile', 'intermediate', 'single_choice', 'Which instruction copies files from build context into the image?', ['COPY / ADD', 'RUN git clone only', 'CMD', 'ENTRYPOINT'], [0], 'COPY (and ADD) add files; RUN executes build steps.'],
    ['Dockerfile', 'intermediate', 'single_choice', 'CMD vs ENTRYPOINT:', ['Same always', 'CMD provides default args (overridable); ENTRYPOINT defines the executable', 'CMD runs at build', 'ENTRYPOINT is a shell'], [1], 'ENTRYPOINT + CMD combine: executable + default arguments.'],
    ['Volumes & Networks', 'intermediate', 'single_choice', 'Docker volumes are used to:', ['Store images', 'Persist data beyond container lifetime', 'Speed builds only', 'Manage CPU'], [1], 'Container filesystems are ephemeral — volumes survive restarts.'],
    ['Volumes & Networks', 'intermediate', 'single_choice', 'Two containers reach each other on a user-defined network via:', ['Link aliases / container names as hostnames', 'Public IP only', 'Port 0', 'Volumes'], [0], 'User-defined networks provide embedded DNS by container name.'],
    ['Compose', 'beginner', 'single_choice', 'docker-compose defines:', ['Multiple containers and their config in one YAML file', 'A single binary', 'Kernel modules', 'CI scripts'], [0], 'docker compose up starts the whole app stack.'],
    ['Registry & Security', 'beginner', 'single_choice', 'Docker Hub is:', ['A local cache only', 'A hosted image registry', 'An IDE', 'An orchestrator'], [1], 'Pull base images from Docker Hub; push your own images too.'],
  ],

  // ── kubernetes ─────────────────────────────────────────────────────────────
  kubernetes: [
    ['Pods & Deployments', 'beginner', 'single_choice', 'A Pod is:', ['A cluster node', 'The smallest deployable unit — one or more containers', 'A namespace label', 'A volume'], [1], 'Pods share network/storage and are scheduled together.'],
    ['Pods & Deployments', 'beginner', 'single_choice', 'What does a Deployment manage?', ['Node hardware', 'ReplicaSets and rolling updates of Pods', 'DNS records', 'Certificates only'], [1], 'Deployments declare desired replicas and handle rollouts/rollbacks.'],
    ['Pods & Deployments', 'intermediate', 'single_choice', 'ReplicaSet ensures:', ['Pods stay on one node', 'A desired number of identical Pods are running', 'Images are built', 'Services are public'], [1], 'It replaces crashed/excess Pods to match the replica count.'],
    ['Pods & Deployments', 'intermediate', 'single_choice', 'A liveness probe does what?', ['Measures network bandwidth', 'Restarts the container if health checks fail', 'Scales nodes', 'Stores logs'], [1], 'Liveness restarts; readiness gates traffic.'],
    ['Services & Networking', 'intermediate', 'single_choice', 'A Kubernetes Service provides:', ['Persistent CPU', 'A stable virtual IP/DNS load-balancing to Pods', 'Image registry', 'Secret storage'], [1], 'Pods are ephemeral; Services give a stable endpoint.'],
    ['Services & Networking', 'intermediate', 'single_choice', 'Which Service type exposes the cluster service externally by cloud LB?', ['ClusterIP', 'NodePort', 'LoadBalancer', 'Headless only'], [2], 'LoadBalancer provisions an external LB; NodePort opens a port on nodes.'],
    ['Config & Secrets', 'beginner', 'single_choice', 'ConfigMaps hold:', ['Passwords (encrypted)', 'Non-sensitive configuration data', 'TLS private keys', 'Images'], [1], 'Secrets are for sensitive data (base64, optionally encrypted).'],
    ['Config & Secrets', 'intermediate', 'single_choice', 'Secrets differ from ConfigMaps by:', ['Nothing', 'Intended for sensitive data with access controls/encryption', 'Only size', 'They are node-local only'], [1], 'Prefer external secret managers for high-security needs.'],
    ['Storage', 'intermediate', 'single_choice', 'PersistentVolume (PV) is:', ['Pod RAM', 'Cluster storage provisioned independently of a node', 'A config file', 'A namespace'], [1], 'PVCs claim storage; PVs provide it (local, NFS, cloud disks).'],
    ['Scaling & Troubleshooting', 'beginner', 'single_choice', 'Which command shows Pod logs?', ['kubectl logs pod/name', 'k8s show', 'kube logcat', 'kubectl print'], [0], 'kubectl logs prints container stdout/stderr.'],
  ],

  // ── ci-cd ──────────────────────────────────────────────────────────────────
  'ci-cd': [
    ['Pipelines', 'beginner', 'single_choice', 'CI stands for:', ['Continuous integration', 'Central installer', 'Code inspection', 'Cloud instance'], [0], 'CI = frequently merging and building code automatically.'],
    ['Pipelines', 'beginner', 'single_choice', 'CD stands for:', ['Continuous delivery/deployment', 'Code documentation', 'Cluster driver', 'Copy data'], [0], 'CD automates releasing builds to environments.'],
    ['Pipelines', 'intermediate', 'single_choice', 'A pipeline typically runs stages in:', ['Random order', 'Build → Test → Deploy order', 'Deploy → Build', 'Test only'], [1], 'Earlier failures gate later (expensive) stages.'],
    ['Build & Test Automation', 'intermediate', 'single_choice', 'Why run unit tests in CI?', ['To find regressions early on every change', 'To slow builds', 'To replace code review', 'To deploy manually'], [0], 'Fast feedback on breakage before merge/deploy.'],
    ['Build & Test Automation', 'intermediate', 'single_choice', 'A build artifact is:', ['A design mock', 'The packaged output (jar/image/bundle) of a build', 'A failing test', 'A commit message'], [1], 'Promote the same artifact across environments.'],
    ['Build & Test Automation', 'advanced', 'single_choice', 'Flaky tests are:', ['Tests failing intermittently without code change', 'Always passing tests', 'Skipped tests', 'Performance tests only'], [0], 'They erode trust in CI — quarantine and fix them.'],
    ['Deployment Strategies', 'intermediate', 'single_choice', 'Blue-green deployment involves:', ['Running two environments and switching traffic atomically', 'Deploying on weekends', 'A/B testing only', 'Rolling back automatically'], [0], 'Instant rollback by switching back to the old environment.'],
    ['Deployment Strategies', 'intermediate', 'single_choice', 'Canary deployment means:', ['Releasing to a small user subset first, then expanding', 'Deploying all at once', 'Deleting the app', 'Testing locally'], [0], 'Limits blast radius; monitor before full rollout.'],
    ['Artifact Management', 'beginner', 'single_choice', 'Container images for release are stored in:', ['A container registry', 'Git branches only', 'Email', 'Jenkins logs'], [0], 'Registries (ECR/ACR/GHCR/Docker Hub) host versioned images.'],
    ['Quality Gates', 'advanced', 'single_choice', 'A quality gate in a pipeline:', ['Blocks merge/deploy when thresholds (tests/coverage/security) fail', 'Skips tests to go faster', 'Deletes artifacts', 'Auto-approves PRs'], [0], 'SonarQube-style checks enforce standards automatically.'],
  ],

  // ── terraform ──────────────────────────────────────────────────────────────
  terraform: [
    ['HCL Basics', 'beginner', 'single_choice', 'Terraform configuration language is called:', ['HCL (HashiCorp Configuration Language)', 'YAML only', 'Bash', 'JSON only'], [0], 'HCL blocks: resource, variable, output, provider.'],
    ['HCL Basics', 'beginner', 'single_choice', 'Which command plans infrastructure changes?', ['terraform plan', 'terraform build', 'tf check', 'terraform init --plan'], [0], 'plan previews changes before apply.'],
    ['Resources & State', 'intermediate', 'single_choice', 'Terraform state file tracks:', ['User passwords', 'Real-world resources mapped to configuration', 'Git history', 'CPU metrics'], [1], 'State enables diffing desired vs actual infrastructure.'],
    ['Resources & State', 'intermediate', 'single_choice', 'terraform apply does what?', ['Deletes everything', 'Executes changes to reach the desired state', 'Only formats code', 'Pauses resources'], [1], 'After plan approval, apply performs the actions.'],
    ['Resources & State', 'advanced', 'single_choice', 'Why must the state file be shared/locked for teams?', ['It is smaller then', 'To prevent concurrent runs corrupting state (locking + remote backend)', 'To reduce cost', 'It is required by HCL'], [1], 'Remote backends (S3 + DynamoDB lock, Terraform Cloud) coordinate teams.'],
    ['Modules', 'intermediate', 'single_choice', 'A Terraform module is:', ['A reusable, encapsulated group of resources', 'A single variable', 'A cloud provider', 'A test only'], [0], 'Modules promote reuse and consistent patterns.'],
    ['Modules', 'advanced', 'single_choice', 'Module registry usage lets you:', ['Download verified community modules', 'Bypass state', 'Disable locking', 'Run local scripts only'], [0], 'e.g. source = "terraform-aws-modules/..." modules from the registry.'],
    ['Remote State', 'intermediate', 'single_choice', 'Recommended remote backends include:', ['Local only', 'S3, Terraform Cloud, Consul, Azure Blob', 'Git only', 'Email'], [1], 'Centralized state with locking and versioning.'],
    ['Workspaces & Secrets', 'advanced', 'single_choice', 'Secrets should be stored in:', ['tfstate / hard-coded variables', 'A secrets manager or sensitive variables injected at runtime', 'Git history', 'Public buckets'], [1], 'Never commit credentials; mark variables sensitive and inject externally.'],
    ['Workspaces & Secrets', 'intermediate', 'single_choice', 'terraform fmt does:', ['Formats HCL code consistently', 'Deploys resources', 'Deletes state', 'Downloads providers only'], [0], 'Keeps configuration uniformly formatted.'],
  ],

  // ── ansible ────────────────────────────────────────────────────────────────
  ansible: [
    ['Playbooks', 'beginner', 'single_choice', 'An Ansible playbook is:', ['A YAML file defining tasks for hosts', 'A compiled binary', 'A dashboard', 'A Python package'], [0], 'Playbooks describe desired configuration declaratively.'],
    ['Playbooks', 'beginner', 'single_choice', 'Ansible is agent-based or agentless?', ['Requires an agent on every host', 'Agentless over SSH/WinRM', 'Agent only on control node', 'No connectivity needed'], [1], 'Only the control node needs Ansible installed.'],
    ['Playbooks', 'intermediate', 'single_choice', 'Idempotency in Ansible means:', ['Running twice changes config again', 'Running multiple times converges to the same state', 'Tasks always fail', 'No modules exist'], [1], 'Re-runs should not keep changing compliant systems.'],
    ['Inventory & Modules', 'beginner', 'single_choice', 'The inventory contains:', ['Playbook tasks', 'The list of target hosts/groups', 'Logs', 'Roles only'], [1], 'Static INI or dynamic cloud plugin inventories.'],
    ['Inventory & Modules', 'intermediate', 'single_choice', 'Which module installs a package (apt/yum)?', ['package / apt / yum modules', 'shell echo', 'copy only', 'template only'], [0], 'Prefer built-in modules over raw shell commands.'],
    ['Inventory & Modules', 'intermediate', 'single_choice', 'ansible-playbook command does:', ['Runs a playbook', 'Installs Ansible', 'Creates inventory only', 'Pings dashboard'], [0], 'ansible-playbook site.yml executes the tasks.'],
    ['Roles', 'intermediate', 'single_choice', 'An Ansible role provides:', ['A structured, reusable bundle of tasks/handlers/templates', 'A user login', 'A cloud account', 'A test runner'], [0], 'roles/common, roles/web with standard directory layout.'],
    ['Variables & Templates', 'intermediate', 'single_choice', 'Jinja2 templates in Ansible are used to:', ['Render config files with variables', 'Encrypt disks', 'Schedule jobs', 'Build kernels'], [0], 'template module renders .j2 files onto targets.'],
    ['Variables & Templates', 'advanced', 'single_choice', 'Variable precedence: which wins?', ['Role defaults (lowest)', 'Extra vars passed with -e (highest among standard sources)', 'All equal', 'Inventory always'], [1], '-e extra vars override nearly everything.'],
    ['Galaxy & Security', 'beginner', 'single_choice', 'Ansible Galaxy is:', ['A CI tool', 'A hub for sharing community roles/collections', 'An editor', 'A monitor'], [1], 'ansible-galaxy install downloads shared content.'],
  ],

  // ── linux ──────────────────────────────────────────────────────────────────
  linux: [
    ['File System', 'beginner', 'single_choice', 'What does pwd print?', ['User password', 'Current working directory', 'Process list', 'Disk usage'], [1], 'pwd = print working directory.'],
    ['File System', 'beginner', 'single_choice', 'Which command copies files?', ['cp', 'mv-only', 'cat-copy', 'mk'], [0], 'cp source destination copies; mv moves/renames.'],
    ['File System', 'intermediate', 'single_choice', 'In Linux, /etc usually stores:', ['User home folders', 'System configuration files', 'Temporary files', 'Kernel modules only'], [1], 'Config files like /etc/passwd, /etc/ssh live here.'],
    ['Permissions', 'beginner', 'single_choice', 'chmod 755 on a file gives the owner:', ['Read-only', 'Read, write, execute', 'Execute only', 'No access'], [1], '7 = rwx for owner; 5 = r-x for group/others.'],
    ['Permissions', 'intermediate', 'single_choice', 'What does chown change?', ['File contents', 'File ownership (user/group)', 'File name', 'Permissions bits only'], [1], 'chown user:group file.'],
    ['Permissions', 'intermediate', 'single_choice', 'The sticky bit on /tmp means:', ['Fast access', 'Only the file owner/root can delete entries', 'Encryption on', 'No execute'], [1], 'Prevents users deleting others’ files in shared dirs.'],
    ['Shell Commands', 'beginner', 'single_choice', 'Which command shows the first 10 lines of a file by default?', ['head', 'top-only', 'see', 'open'], [0], 'head = first lines; tail = last lines.'],
    ['Shell Commands', 'intermediate', 'single_choice', 'grep is used to:', ['Search text patterns in files', 'Edit files', 'Copy disks', 'Format partitions'], [0], 'e.g. grep -i "error" app.log searches case-insensitively.'],
    ['Processes & Services', 'intermediate', 'single_choice', 'Which command lists running processes interactively?', ['ps aux (and top/htop)', 'df -h', 'uname', 'chmod'], [0], 'top/htop give a live view; ps shows a snapshot.'],
    ['Networking & Logs', 'intermediate', 'single_choice', 'ss or netstat shows:', ['Open ports/connections', 'File sizes', 'Users', 'Cron jobs'], [0], 'Use to check which service listens on a port.'],
  ],

  // ── bash ───────────────────────────────────────────────────────────────────
  bash: [
    ['Variables & Operators', 'beginner', 'single_choice', 'How do you reference a variable in bash?', ['$VAR', 'VAR#', '@VAR', '%VAR%'], [0], 'Assignment has no $; expansion uses $VAR or ${VAR}.'],
    ['Variables & Operators', 'beginner', 'single_choice', 'What does VAR="hello world" do?', ['Prints it', 'Assigns the string to VAR (quotes handle spaces)', 'Runs a command', 'Declares a function'], [1], 'Quotes keep multi-word values intact.'],
    ['Variables & Operators', 'intermediate', 'single_choice', 'The difference between $@ and $* when quoted:', ['$@ expands each argument separately; "$*" joins with space', 'No difference', '$* is invalid', 'Only $@ works with loops'], [0], '"$@" preserves argument boundaries — essential for loops over args.'],
    ['Control Flow', 'beginner', 'single_choice', 'Which keyword starts a conditional in bash?', ['if', 'when', 'case-only', 'check'], [0], 'if [ condition ]; then ... fi.'],
    ['Control Flow', 'intermediate', 'single_choice', 'What does [ -f file ] test?', ['File exists and is a regular file', 'File is empty', 'Directory only', 'File is executable'], [0], '-d tests directory; -x tests executable permission.'],
    ['Control Flow', 'intermediate', 'single_choice', 'A for loop in bash iterates over:', ['Fixed integers only', 'A list of words/expanded values', 'Network sockets only', 'Environment variables only'], [1], 'for f in *.txt; do ... done loops over filenames.'],
    ['Functions', 'beginner', 'single_choice', 'How is a function defined in bash?', ['function name { ... } or name() { ... }', 'def name():', 'func name =>', 'sub name'], [0], 'Both syntaxes work in bash.'],
    ['Text Tools', 'intermediate', 'single_choice', 'What does awk do?', ['Pattern scanning and processing with field-based actions', 'Compile C', 'Compress files', 'Kill processes'], [0], "awk '{print $1}' prints the first column."],
    ['Text Tools', 'intermediate', 'single_choice', 'sed is mainly used for:', ['Stream editing (search & replace)', 'Scheduling', 'Summing disk usage', 'Sending mail'], [0], "sed 's/old/new/g' file replaces text."],
    ['Automation', 'advanced', 'single_choice', 'What does set -e do in a script?', ['Enables debug output', 'Exits immediately when a command fails', 'Sets variables', 'Runs as root'], [1], 'Fail fast; pair with set -u and set -o pipefail.'],
  ],

  // ── git ────────────────────────────────────────────────────────────────────
  git: [
    ['Basics & Staging', 'beginner', 'single_choice', 'Which command stages all changes?', ['git add .', 'git commit all', 'git push -a', 'git stage none'], [0], 'git add . stages new/modified/deleted files in the current directory.'],
    ['Basics & Staging', 'beginner', 'single_choice', 'git commit does:', ['Uploads to remote', 'Records staged changes locally with a message', 'Deletes branch', 'Merges origin'], [1], 'Commits are local until pushed.'],
    ['Basics & Staging', 'beginner', 'single_choice', 'What does git status show?', ['Remote speed', 'Working tree state (modified/staged/untracked)', 'Commit diffs only', 'User list'], [1], 'First stop before committing.'],
    ['Branching', 'beginner', 'single_choice', 'Which command creates and switches to a branch?', ['git switch -b name (or git checkout -b)', 'git branch --go', 'git new name', 'git fork name'], [0], 'Branches let you develop features in isolation.'],
    ['Branching', 'intermediate', 'single_choice', 'git branch -a lists:', ['Only local branches', 'Local and remote-tracking branches', 'Deleted branches', 'Tags only'], [1], 'Shows remotes/origin/* refs too.'],
    ['Merging & Rebasing', 'intermediate', 'single_choice', 'git merge feature does:', ['Deletes feature', 'Combines feature history into the current branch', 'Rewrites messages', 'Stashes changes'], [1], 'May create a merge commit or fast-forward.'],
    ['Merging & Rebasing', 'advanced', 'single_choice', 'git rebase main does:', ['Moves your commits on top of main for a linear history', 'Merges main into yours with a merge commit', 'Deletes main', 'Copies remote'], [0], 'Avoid rebasing shared/public branches.'],
    ['Remote & Collaboration', 'beginner', 'single_choice', 'git push does:', ['Fetches remote code', 'Uploads local commits to the remote', 'Merges branches', 'Shows log'], [1], 'Opposite of git pull/fetch (download).'],
    ['Remote & Collaboration', 'intermediate', 'single_choice', 'A merge conflict occurs when:', ['Disk is full', 'Both branches changed the same lines and Git cannot auto-merge', 'User has no rights', 'Repo is empty'], [1], 'Resolve by editing markers, then add and commit.'],
    ['History & Recovery', 'intermediate', 'single_choice', 'Which command shows commit history?', ['git log', 'git history -p only', 'git show-all', 'git list'], [0], 'git log --oneline --graph visualizes branches.'],
  ],

  // ── jenkins ────────────────────────────────────────────────────────────────
  jenkins: [
    ['Pipelines', 'beginner', 'single_choice', 'Jenkins is primarily:', ['A source code language', 'An automation server for CI/CD', 'A database', 'An IDE'], [1], 'It builds, tests and deploys via jobs/pipelines.'],
    ['Pipelines', 'intermediate', 'single_choice', 'A Jenkinsfile is:', ['A log file', 'Groovy code defining the pipeline as code', 'A plugin name', 'A credential'], [1], 'Stored in the repo alongside source.'],
    ['Pipelines', 'intermediate', 'single_choice', 'Declarative pipeline stages are defined with:', ['stage blocks', 'case blocks', 'phase blocks', 'step only'], [0], 'pipeline { agent any stages { stage("Build") {...} } }.'],
    ['Freestyle Jobs', 'beginner', 'single_choice', 'A freestyle project can:', ['Only compile Java', 'Run build steps, triggers and post-build actions via UI', 'Nothing without plugins', 'Only send email'], [1], 'Simplest job type; pipelines are more flexible.'],
    ['Freestyle Jobs', 'intermediate', 'single_choice', 'A build trigger commonly used with SCM:', ['Poll SCM or webhook from GitHub/GitLab', 'Manual only', 'Every minute always', 'On server reboot'], [0], 'Webhooks push notifications; poll SCM checks periodically.'],
    ['Plugins', 'intermediate', 'single_choice', 'Jenkins plugins are used to:', ['Add integrations and features (Git, Docker, notifications)', 'Change the logo', 'Replace Groovy', 'Delete builds'], [0], 'Thousands of plugins extend core functionality.'],
    ['Plugins', 'beginner', 'single_choice', 'Where are plugins managed?', ['Manage Jenkins → Plugins', 'Jenkinsfile only', 'CLI only', 'Git repo'], [0], 'Install/update from the plugin manager UI.'],
    ['Security', 'intermediate', 'single_choice', 'Credentials in Jenkins should be:', ['Hard-coded in Jenkinsfile', 'Stored as credentials with restricted scope and masked in logs', 'Shared in chat', 'Plaintext in repo'], [1], 'Reference by ID; never print secrets.'],
    ['Security', 'advanced', 'single_choice', 'Matrix-based authorization provides:', ['Role/permission control per user/group', 'Automatic code review', 'Backup', 'Load balancing'], [0], 'Fine-grained control over who can configure/run jobs.'],
    ['Distributed Builds', 'intermediate', 'single_choice', 'Jenkins agents (slaves) are for:', ['UI rendering', 'Offloading build executors to other machines', 'Mail delivery', 'Plugin hosting'], [1], 'Distribute load; labels route jobs to capable nodes.'],
  ],

  // ── devops ─────────────────────────────────────────────────────────────────
  devops: [
    ['DevOps Culture', 'beginner', 'single_choice', 'DevOps primarily aims to:', ['Separate dev and ops more', 'Bridge development and operations for faster delivery', 'Replace testing', 'Reduce communication'], [1], 'Culture of shared ownership and collaboration.'],
    ['DevOps Culture', 'beginner', 'single_choice', 'Infrastructure as Code (IaC) means:', ['Writing docs for servers', 'Managing infrastructure via version-controlled configuration files', 'Hand-racking servers', 'Using spreadsheets'], [1], 'Terraform/CloudFormation/Pulumi codify infra.'],
    ['DevOps Culture', 'intermediate', 'single_choice', 'The DevOps feedback loop includes:', ['Plan → Code → Build → Test → Release → Deploy → Operate → Monitor → (back to Plan)', 'Code → Sleep', 'Deploy → Hope', 'Monitor only'], [0], 'Continuous improvement through each phase.'],
    ['CI/CD', 'intermediate', 'single_choice', 'The fastest way to catch integration breakage:', ['Nightly manual testing', 'Build and test every merge automatically', 'Quarterly releases', 'Post-release monitoring'], [1], 'Frequent integration surfaces conflicts early.'],
    ['CI/CD', 'intermediate', 'single_choice', 'Trunk-based development favors:', ['Long-lived feature branches', 'Short-lived branches merged frequently to main', 'No version control', 'Manual merges quarterly'], [1], 'Small batches + feature flags reduce risk.'],
    ['Infrastructure as Code', 'intermediate', 'single_choice', 'Immutable infrastructure means:', ['Servers are edited live until broken', 'Rebuild/replace instances from templates instead of hot-patching', 'No automation', 'Manual imaging only'], [1], 'Drift-free, repeatable environments.'],
    ['Infrastructure as Code', 'advanced', 'single_choice', 'Drift occurs when:', ['DNS changes', 'Live infrastructure differs from the declared code state', 'Containers restart', 'Tests pass'], [1], 'Detect with plan/drift detection; reconcile regularly.'],
    ['Monitoring & Logging', 'intermediate', 'single_choice', 'Golden signals for monitoring (per SRE) are:', ['Latency, traffic, errors, saturation', 'CPU, RAM, Disk, Network only', 'Uptime only', 'Git commits'], [0], 'Four signals that reflect user-facing health.'],
    ['Monitoring & Logging', 'intermediate', 'single_choice', 'Centralized logging helps by:', ['Correlating events across services in one place', 'Replacing metrics', 'Slowing apps', 'Encrypting disks'], [0], 'ELK/Loki/Cloud logs aggregate searchable logs.'],
    ['Site Reliability', 'advanced', 'single_choice', 'Error budget equals:', ['Money spent on errors', 'Allowed unreliability over a period (100% − SLO)', 'Number of pages', 'Bug count'], [1], 'Budget spent fast → slow down changes; leftover → ship more.'],
  ],

  // ── web-servers ────────────────────────────────────────────────────────────
  'web-servers': [
    ['HTTP Handling', 'beginner', 'single_choice', 'A web server’s core job is:', ['Store source code', 'Receive HTTP requests and return responses (static/dynamic)', 'Compile TypeScript', 'Run mobile apps'], [1], 'Nginx/Apache serve files and proxy to app servers.'],
    ['HTTP Handling', 'beginner', 'single_choice', 'HTTP 404 from a web server means:', ['Server error', 'Requested resource not found', 'Permission granted', 'Redirect'], [1], 'Client requested a path that does not exist.'],
    ['Nginx Configuration', 'intermediate', 'single_choice', 'In Nginx, a server block primarily defines:', ['A virtual host (domain/listener + routes)', 'A database', 'An OS user', 'TLS certificate storage only'], [0], 'Multiple server blocks can share one Nginx instance.'],
    ['Nginx Configuration', 'intermediate', 'single_choice', 'location /api/ { proxy_pass ... } does what?', ['Serves static files only', 'Proxies matching requests to a backend service', 'Redirects to Google', 'Blocks all traffic'], [1], 'Classic reverse-proxy pattern for app servers.'],
    ['Apache Configuration', 'intermediate', 'single_choice', '.htaccess files are used for:', ['Per-directory config overrides (URL rewrites, auth)', 'Logging only', 'TLS keys', 'Caching CPU'], [0], 'Works with AllowOverride enabled; Nginx does not support htaccess.'],
    ['Reverse Proxy & TLS', 'intermediate', 'single_choice', 'A reverse proxy sits:', ['Between clients and backend servers, forwarding on their behalf', 'Between two clients', 'Inside the browser only', 'Behind the firewall as a client'], [0], 'Adds load balancing, TLS termination and caching.'],
    ['Reverse Proxy & TLS', 'intermediate', 'single_choice', 'TLS termination at the proxy means:', ['Disabling encryption', 'Decrypting traffic at the proxy (backend can use plain HTTP)', 'Removing certificates', 'Blocking HTTPS'], [1], 'Centralizes certificates; encrypt end-to-end if required.'],
    ['Reverse Proxy & TLS', 'beginner', 'single_choice', 'Which tool commonly obtains Let’s Encrypt certificates automatically?', ['certbot', 'curl', 'make', 'grep'], [0], 'certbot configures ACME renewal for Nginx/Apache.'],
    ['Performance & Security', 'intermediate', 'single_choice', 'Enabling gzip/brotli compression mainly reduces:', ['CPU cores', 'Response size over the wire (faster page loads)', 'Disk usage', 'Memory leaks'], [1], 'Compress text assets served to clients.'],
    ['Performance & Security', 'advanced', 'single_choice', 'Rate limiting protects against:', ['Slow disk', 'Request floods (e.g. brute force / DDoS attempts)', 'Code linting', 'Git conflicts'], [1], 'limit_req in Nginx throttles per-IP request rates.'],
  ],
};
