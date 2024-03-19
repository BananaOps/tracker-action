const axios = require('axios');
const core = require('@actions/core');
const github = require('@actions/github');

try {
  //
  const context = github.context;

  // input defined in action metadata file
  const host :string = core.getInput('host');
  const lockEnable = core.getInput('lock-enable');
  const trackerService = core.getInput('service');

  console.log(`lock is enable ${lockEnable}`);
  console.log(`tracker host ${host}`);
  console.log(`tracker service ${trackerService}`);

  context.payload.head_commit.message;

  postToAPI(host);

  // Get the JSON webhook payload for the event that triggered the workflow
  const payload = JSON.stringify(github.context.payload, undefined, 2)
  console.log(`The event payload: ${payload}`);
} catch (error:any) {
  core.setFailed(error.message);
}


async function postToAPI(host:string) {
  const body = {
    title: "Deployment service lambda",
    attributes: {
      message: "deployment service version v0.0.1",
      source: "github_action",
      type: 1,
      priority: 1,
      relatedId: "",
      service: "service-event",
      status: 1
    },
    links: {
      pullRequestLink: "https://github.com/bananaops/events-tracker/pull/240"
    }
  };

  try {
    const response = await axios.post("https://" + host + "/api/v1alpha1/event", body);
    console.log('Réponse de l\'API :', response.data);
  } catch (error) {
    console.error('Erreur lors de la requête POST :', error);
  }
}
