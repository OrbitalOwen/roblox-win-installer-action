import * as fs from "fs";
import * as path from "path";
import * as child_process from "child_process";

import * as core from "@actions/core";
import { getOctokit } from "@actions/github";
import { downloadTool, extractZip } from "@actions/tool-cache";

const GITHUB_USER = "OrbitalOwen";
const REPO_NAME = "roblox-win-installer";
const COMMAND_TIMEOUT = 60 * 5 * 1000;

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
				core.info(`Using version ${release.tag_name}`);
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

		core.info(`Using version ${response.data.tag_name}`);

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

	const zipPath = await downloadTool(release.zipball_url);
	const extractedPath = await extractZip(zipPath);
	const repoDirectory = await getChildDir(extractedPath);

	return repoDirectory;
}

function execCommand(
	command: string,
	args: string[],
	cwd: string,
	timeout?: number
): Promise<void> {
	return new Promise((resolve, reject) => {
		const process = child_process.spawn(command, args, { cwd });

		process.stdout.on("data", (data) => {
			try {
				core.info(String(data));
			} catch (err) {
				console.error(err);
			}
		});

		process.stderr.on("data", (data) => {
			try {
				core.error(String(data));
			} catch (err) {
				console.error(err);
			}
		});

		process.on("error", (error) => {
			reject(error);
		});

		process.on("close", (code) => {
			if (code === 0) {
				resolve();
			} else {
				reject(`Process exited with: ${code}`);
			}
		});

		if (timeout) {
			setTimeout(() => {
				process.kill();
			}, timeout);
		}
	});
}
async function install() {
	const cwd = await downloadRelease();

	await execCommand("pip", ["install", "-r", "requirements.txt"], cwd);
	await execCommand(`python`, ["install.py", cookie], cwd, COMMAND_TIMEOUT);

	core.info("Installation completed");
}

install()
	.then(() => {
		process.exit(0);
	})
	.catch((error) => {
		core.setFailed(error.message);
	});
