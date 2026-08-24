import * as core from '@actions/core';
import * as github from '@actions/github';
import { analyzePhpCode } from './analyzer';

async function run() {
  try {
    const token = core.getInput('github_token', { required: true });
    const octokit = github.getOctokit(token);

    const { context } = github;

    if (!context.payload.pull_request) {
      core.info('Esta action só deve ser executada em Pull Requests. Abortando.');
      return;
    }

    const prNumber = context.payload.pull_request.number;
    const owner = context.repo.owner;
    const repo = context.repo.repo;

    // Obtém os arquivos modificados no PR
    const { data: files } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber
    });

    let hasErrors = false;
    let issuesFound = 0;

    for (const file of files) {
      if (!file.filename.endsWith('.php')) continue;
      
      // Ignora arquivos deletados
      if (file.status === 'removed') continue;

      // Baixa o conteúdo do arquivo
      const { data: fileContent } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: file.filename,
        ref: context.payload.pull_request.head.sha,
        mediaType: { format: 'raw' }
      });

      const content = fileContent as unknown as string;
      
      core.info(`Analisando ${file.filename}...`);
      
      const issues = analyzePhpCode(file.filename, content);

      for (const issue of issues) {
        issuesFound++;
        
        if (issue.severity === 'error') {
          hasErrors = true;
          core.error(issue.message, { file: issue.file, startLine: issue.line });
        } else {
          core.warning(issue.message, { file: issue.file, startLine: issue.line });
        }

        // Tenta postar um comentário inline no PR
        try {
          await octokit.rest.pulls.createReviewComment({
            owner,
            repo,
            pull_number: prNumber,
            body: issue.message,
            commit_id: context.payload.pull_request.head.sha,
            path: issue.file,
            line: issue.line,
            side: 'RIGHT'
          });
        } catch (e: any) {
          // As vezes falha se a linha não faz parte do diff atual, apenas ignora
          core.debug(`Não foi possível postar o comentário inline na linha ${issue.line}: ${e.message}`);
        }
      }
    }

    if (hasErrors) {
      core.setFailed(`❌ Action falhou! Encontramos ${issuesFound} problema(s) (N+1 ou Má prática) que você precisa corrigir antes de aceitarmos o Pull Request.`);
    } else if (issuesFound > 0) {
      core.info(`✅ Passou com ${issuesFound} aviso(s) (Warnings). Considere refatorar, mas o PR não será bloqueado.`);
    } else {
      core.info('✅ Nenhum problema de N+1 ou anti-pattern encontrado. Excelente código!');
    }

  } catch (error: any) {
    core.setFailed(`Erro fatal ao executar a Action: ${error.message}`);
  }
}

run();
