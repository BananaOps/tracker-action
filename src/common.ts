const axios = require('axios');
const core = require('@actions/core');
const github = require('@actions/github');

interface PullRequest {
    title: string;
    body: string;
    number: number;
    html_url: string;
    labels: string[] | null;
    assignees: string[] | null;
}

interface Event {
    title: string;
    message: string;
    service: string;
    priority: string;
    status: string;
    relatedId: string;
}


// func used in index.ts
export async function run() {
    return runCommands(false)
}

// func used in post.ts
export async function post() {
    const jobStatus = await getJobStatus()
    if (jobStatus != "success") {
        return runCommands(true)
    }
    return;
}

async function runCommands(post: boolean) {
    try {
        // get context payload
        const payload = github.context.payload;

        // input defined in action metadata file
        let host: string = core.getInput('tracker_host');
        const lockEnable: boolean = core.getInput('lock_enable')

        const event: Event = {
            title: core.getInput('title'),
            message: core.getInput('message'),
            service: core.getInput('service'),
            priority: core.getInput('priority'),
            status: core.getInput('status'),
            relatedId: core.getInput('related_id'),
        }

        // overide status if post action
        if (post == true) {
            event.status = "failure";
        }

        // set event.title if null
        if (event.title === "") {
            event.title = payload.job + " on " + payload.repository.name
            console.warn("set default title: " + payload.job + " on " + payload.repository.name)
            
        }

        // set event.message = event.title if null
        if (event.message === "") {
            event.message = event.title
            console.warn("set default message: " + event.title)
            
        }

        // add debug log
        console.debug(`lock is enable ${lockEnable}`);
        console.debug(`tracker host ${host}`);

        const githubToken = core.getInput('github_token');
        let pull: any = null
        if (githubToken !== "") {
             // get merged pull request information
            pull = getMergedPullRequest(
                githubToken,
                github.context.repo.owner,
                github.context.repo.repo,
                github.context.sha
            );
        }

        if (pull === null && githubToken !== "") {
            console.debug('pull request not found');
        }

        // ensure http scheme is present
        host = ensureHttpScheme(host);

        postToAPI(
            host,
            payload,
            event,
            pull);

    } catch (error: any) {
        core.setFailed(error.message);
    }
}


// func to get job status
async function getJobStatus(): Promise<string> {
    const context = github.context;

    // get job context status
    const jobStatus = context.job.status;

    console.debug('job status:', jobStatus);
    return jobStatus
}

// func to get merged pull request payload
async function getMergedPullRequest(
    githubToken: string,
    owner: string,
    repo: string,
    sha: string
): Promise<PullRequest | null> {
    const octokit = github.getOctokit(githubToken);

    const resp = await octokit.rest.pulls.list({
        owner,
        repo,
        sort: 'updated',
        direction: 'desc',
        state: 'closed',
        per_page: 100
    });

    const pull = resp.data.find((p: any) => p.merge_commit_sha === sha);
    if (!pull) {
        return null;
    }

    return {
        title: pull.title,
        body: pull.body as string,
        number: pull.number,
        html_url: pull.html_url,
        labels: pull.labels.map((l: any) => l.name as string),
        assignees: pull.assignees!.map((a: any) => a.login)
    };
}

// func to post event on tracker api
async function postToAPI(host: string, payload: any, event: Event, pull: any) {

    // check if pull is not null
    let pullRequestLink: string = ""
    if (pull !== null ) {
        pullRequestLink = pull.html_url
    }
    
    const body = {
        title: event.title,
        attributes: {
            message: event.message,
            source: "github_action",
            type: 1,
            priority: event.priority,
            relatedId: event.relatedId,
            service: payload.repository.name,
            status: event.status
        },
        links: {
            pullRequestLink: pullRequestLink,
        }
    };

    try {
        const response = await axios.post(host + "/api/v1alpha1/event", body);
        console.log('tracker response:', response.data);
        core.setOutput('id', response.data.event.metadata.id)
    } catch (error: any) {
        console.error('Erreur lors de la requête POST :', error);
        core.setFailed(error);
    }
}

// func to ensure http scheme is present
function ensureHttpScheme(url: string): string {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        // If scheme is not present, add it as HTTP by default
        return 'http://' + url;
    }
    return url;
}
