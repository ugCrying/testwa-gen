module.exports = {
  "increment": "conventional:angular",
  "scripts": {
    "beforeStage": "npx conventional-changelog -p angular -i CHANGELOG.md -s"
  },
  "github": {
    "release": true,
    "draft": true,
    "tokenRef": "GH_TOKEN"
  },
  "npm": {
    "publish": false,
    "publishPath": "."
  },
  "git": {
    "commitArgs": "--no-verify",
    "requireCleanWorkingDir": false,
    "tagName": "v${version}"
  }
}