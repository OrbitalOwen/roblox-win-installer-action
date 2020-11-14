import * as fs from "fs";
import * as path from "path";
import * as core from "@actions/core";
import { exec } from "@actions/exec";
import { getOctokit } from "@actions/github";
import { downloadTool, extractZip } from "@actions/tool-cache";

const GITHUB_USER = "OrbitalOwen";
const REPO_NAME = "roblox-win-installer";

const cookie = core.getInput("cookie");
const version = core.getInput("version");
const githubToken = core.getInput("token");

async function getRelease() {
	const octokit = getOctokit(githubToken);

	if (version) {
		const response = await octokit.repos.listReleases({
			owner: GITHUB_USER,
			repo: REPO_NAME,
		});

		for (const release of response.data) {
			if (release.tag_name === version) {
				return release;
			}
		}
		throw new Error(
			`${GITHUB_USER}/${REPO_NAME} release ${version} not found`
		);
	} else {
		const response = await octokit.repos.getLatestRelease({
			owner: GITHUB_USER,
			repo: REPO_NAME,
		});

		return response.data;
	}
}

async function getChildDir(directory: string) {
	const files = await fs.promises.readdir(directory);
	const childDirectory = files.find((file) => {
		return fs.statSync(path.join(directory, file)).isDirectory();
	});

	if (!childDirectory) {
		throw new Error("Directory not found");
	}

	return path.join(directory, childDirectory);
}

async function downloadRelease() {
	const release = await getRelease();

	core.info(`Downloading release ${release.zipball_url}`);
	const zipPath = await downloadTool(release.zipball_url);
	core.info(`Downloaded zip ${zipPath}`);
	const extractedPath = await extractZip(zipPath);
	core.info(`Extracted zip ${extractedPath}`);
	const repoDirectory = await getChildDir(extractedPath);
	core.info(`Got repo directory ${repoDirectory}`);

	return repoDirectory;
}

async function install() {
	const path = await downloadRelease();

	const options = { cwd: path };

	await exec("ls", [], options);
	await exec("pip", ["install", "-r requirements.txt"], options);
	await exec("python", ["install.py", cookie], options);

	core.info("Installation completed");
}

install().catch((error) => {
	core.setFailed(error.message);
});
