workflow "Main" {
  on = "push"
  resolves = []
}

action "Install" {
  uses = "docker://culturehq/actions-yarn:latest"
  args = "install"
}

action "Build" {
  needs = ["Install"]
  uses = "docker://culturehq/actions-yarn:latest"
  args = "build"
}

action "Publish dev build" {
  needs = ["Build"]
  uses = "./.github/actions/publish-dev-build"
  secrets = ["GITHUB_TOKEN"]
}
