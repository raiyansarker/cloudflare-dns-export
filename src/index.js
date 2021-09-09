const core = require("@actions/core");
const axios = require("axios");
const { format } = require("date-fns");
const { encode } = require("js-base64");
const { Octokit } = require("@octokit/rest");

async function main() {
  const NAME = core.getInput("NAME", { required: true });
  const GITHUB_TOKEN = core.getInput("GITHUB_TOKEN", { required: true });
  const ZONE_ID = core.getInput("ZONE_ID", { required: true });
  const API_KEY = core.getInput("API_KEY", { required: true });
  const FOLDER = core.getInput("FOLDER", { required: true });

  if (!NAME)
    core.setFailed("Provide full name. Format: username/repository_name");
  if (!GITHUB_TOKEN) core.setFailed("Provide Github Token");
  if (!ZONE_ID || !API_KEY) core.setFailed("Provide ZONE_ID and API_KEY");

  const octokit = new Octokit({
    auth: GITHUB_TOKEN,
  });
  const now = new Date();
  let data;

  function getTime() {
    const time = now.getTime() + now.getTimezoneOffset() * 60000;
    const name = `${format(time, "dd-MM-yyyy")} - ${format(time, "HH-mm-ss")}`;

    return name;
  }
  try {
    console.log("Downloading DNS information");
    await axios({
      method: "GET",
      url: `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/export`,
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
    })
      .then((response) => {
        data = response.data;
        console.log("Downloaded");
      })
      .catch((error) => console.error(error));

    console.log("Uploading");
    await octokit.repos.createOrUpdateFileContents({
      owner: NAME.split("/")[0],
      repo: NAME.split("/")[1],
      message: `New DNS backup ${getTime()}`,
      path: `${FOLDER}/${ZONE_ID} - ${getTime()}.txt`,
      content: encode(data),
    });
    console.log("Uploaded");
  } catch (error) {
    core.setFailed(error);
  }
}

main();
