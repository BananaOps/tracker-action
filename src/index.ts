const axios = require('axios');
const core = require('@actions/core');
const github = require('@actions/github');

try {
  //
  const context = github.context;

  // input defined in action metadata file
  let host :string = core.getInput('host');
  const lockEnable = core.getInput('lock-enable');
  const trackerService = core.getInput('service');

  console.log(`lock is enable ${lockEnable}`);
  console.log(`tracker host ${host}`);
  console.log(`tracker service ${trackerService}`);

  // ensure http shceme is present
  host = ensureHttpScheme(host);

  postToAPI(host, context.payload);

  // Get the JSON webhook payload for the event that triggered the workflow
 //const payload = JSON.stringify(github.context.payload, undefined, 2)
 //console.log(`The event payload: ${payload}`);
} catch (error:any) {
  core.setFailed(error.message);
}


async function postToAPI(host:string, payload:any) {
  const body = {
    title: "Deployment service lambda",
    attributes: {
      message: payload.head_commit.message,
      source: "github_action",
      type: 1,
      priority: 1,
      relatedId: "",
      service: payload.repository.name,
      status: 1
    },
    links: {
      pullRequestLink: payload.repository.pulls_url,
    }
  };

  try {
    const response = await axios.post(host + "/api/v1alpha1/event", body);
    console.log('Réponse de l\'API :', response.data);
  } catch (error:any) {
    console.error('Erreur lors de la requête POST :', error);
    core.setFailed(error);
  }
}

function ensureHttpScheme(url: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
      // If scheme is not present, add it as HTTP by default
      return 'http://' + url;
  }
  return url;
}
