import subprocess
import random
import string
import os

def run_cmd(cmd):
    print(f"Running: {cmd}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error executing {cmd}:\n{result.stderr}")
    else:
        print(result.stdout)
    return result.returncode == 0

def main():
    # 1. Generate unique ID
    suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=5))
    project_id = f"sahayak-pw26-{suffix}"
    billing_id = "01A72C-A12576-F740D9"
    gcloud = r'"%LOCALAPPDATA%\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"'
    
    print(f"--- Setting up GCP Project: {project_id} ---")
    
    # 2. Create project
    if not run_cmd(f"{gcloud} projects create {project_id} --name=\"Sahayak PromptWars\""):
        return

    # 3. Link billing
    if not run_cmd(f"{gcloud} billing projects link {project_id} --billing-account={billing_id}"):
        return

    # 4. Set as default
    if not run_cmd(f"{gcloud} config set project {project_id}"):
        return

    # 5. Enable APIs
    print("--- Enabling APIs (This takes 60 seconds) ---")
    run_cmd(f"{gcloud} services enable run.googleapis.com build.googleapis.com generativelanguage.googleapis.com --project={project_id}")

    # 6. Deploy to Cloud Run
    print("--- Deploying to Cloud Run ---")
    api_key = os.environ.get("GEMINI_API_KEY", "")
    deploy_cmd = f"{gcloud} run deploy sahayak-demo --source . --region asia-south1 --allow-unauthenticated --set-env-vars=\"GEMINI_API_KEY={api_key}\" --project={project_id} --quiet"
    run_cmd(deploy_cmd)
    
if __name__ == "__main__":
    main()
