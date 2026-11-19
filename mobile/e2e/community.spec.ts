import { test, expect } from '@playwright/test';
import type { ChildProcess } from 'node:child_process';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { resolve } from 'node:path';
import { startOwnedBackend, stopOwnedBackend } from './backend-process';

let backend: ChildProcess;
test.beforeAll(async () => {
  mkdirSync(resolve('../data'), { recursive: true });
  const directory = mkdtempSync(resolve('../data/e2e-community-'));
  backend = await startOwnedBackend({
    java: process.env.TEST_JAVA || 'java', jar: resolve('../backend/target/urban-risk-1.0.0.jar'),
    cwd: resolve('..'), databaseUrl: `jdbc:h2:file:${directory.replaceAll('\\', '/')}/monitoring;DB_CLOSE_ON_EXIT=FALSE;WRITE_DELAY=0`,
    log: resolve('../data/e2e-community.log'),
  });
});
test.afterAll(async () => { await stopOwnedBackend(backend); });
test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', route => route.continue({ url: 'http://127.0.0.1:8082' + new URL(route.request().url()).pathname }));
});

test('registro comunitário, tentativa após erro e ciclo persistido', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByText('Conectado', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Relatos', exact: true }).click();
  await page.screenshot({ path: resolve('../docs/images/urip-relatos-desktop.png') });
  await page.getByRole('button', { name: 'Novo relato comunitário', exact: true }).click();
  const description = 'Água acumulada na rua fictícia de demonstração.';
  await page.getByRole('textbox', { name: 'Descrição da ocorrência', exact: true }).fill(description);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('heading', { name: 'Registrar ocorrência', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: resolve('../docs/images/urip-formulario-390.png') });
  await page.route('**/api/dashboard', route => route.abort('connectionfailed'));
  await page.getByRole('button', { name: 'Atualizar', exact: true }).click();
  await expect(page.getByText('Sem conexão', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enviar relato', exact: true })).toBeDisabled();
  await expect(page.getByRole('textbox', { name: 'Descrição da ocorrência', exact: true })).toHaveValue(description);
  await page.unroute('**/api/dashboard');
  await page.getByRole('button', { name: 'Atualizar', exact: true }).click();
  await expect(page.getByText('Conectado', { exact: true })).toBeVisible();
  await page.route('**/api/reports', route => route.request().method() === 'POST'
    ? route.fulfill({ status: 400, contentType: 'application/json', body: '{"message":"Dados inválidos"}' }) : route.fallback());
  await page.getByRole('button', { name: 'Enviar relato', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Descrição da ocorrência', exact: true })).toBeEditable();
  await expect(page.getByRole('textbox', { name: 'Descrição da ocorrência', exact: true })).toHaveValue(description);
  await page.unroute('**/api/reports');
  await page.route('**/api/reports', async route => {
    if (route.request().method() !== 'POST') return route.fallback();
    await route.fetch({ url: 'http://127.0.0.1:8082/api/reports' });
    await route.abort('connectionfailed');
  });
  await page.getByRole('button', { name: 'Enviar relato', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Descrição da ocorrência', exact: true })).toHaveValue(description);
  await expect(page.getByRole('button', { name: 'Enviar relato', exact: true })).toBeEnabled();
  await expect(page.getByRole('alert').filter({ hasText: 'envio anterior' })).toBeVisible();
  await page.unroute('**/api/reports');
  await page.getByRole('button', { name: 'Enviar relato', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Acompanhamento do relato', exact: true })).toBeVisible();
  await expect(page.getByText(description, { exact: true })).toBeVisible();
  const clientId = await page.evaluate(() => localStorage.getItem('urip:installation:v1'));
  const reports = await (await fetch('http://127.0.0.1:8082/api/reports', { headers: { 'X-Client-Id': clientId! } })).json();
  expect(reports).toHaveLength(1);
  await page.screenshot({ path: resolve('../docs/images/urip-relato-reportado.png') });
  await page.getByRole('button', { name: 'Iniciar acompanhamento', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Encerrar relato', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Encerrar relato', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Encerrar relato', exact: true })).toHaveCount(0);
  await page.getByRole('tab', { name: 'Painel', exact: true }).click();
  await expect(page.getByText('Situação atualizada pelo autor do relato.', { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('Conectado', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Relatos', exact: true }).click();
  await page.getByRole('button', { name: /^Acompanhar relato / }).first().click();
  await expect(page.getByText('Encerrado', { exact: true }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('painel, central e origem navegáveis em tela compacta', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 780 });
  await page.goto('/');
  await expect(page.getByText('Conectado', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Painel', exact: true }).click();
  for (const name of ['Painel', 'Alertas', 'Avisos', 'Relatos', 'Histórico']) {
    const tab=page.getByRole('tab', { name, exact: true });
    await expect(tab).toBeInViewport();
    const bounds=await tab.boundingBox();
    expect(bounds!.width).toBeGreaterThanOrEqual(48);
    expect(bounds!.height).toBeGreaterThanOrEqual(48);
  }
  await expect(page.getByRole('heading', { name: 'Panorama urbano', exact: true })).toBeVisible();
  await page.screenshot({ path: resolve('../docs/images/urip-painel-320.png') });
  await page.getByRole('tab', { name: 'Avisos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Central de notificações', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^Abrir notificação de / }).first().click();
  await expect(page.getByRole('heading', { name: 'Detalhe da ocorrência', exact: true })).toBeVisible();
  await page.screenshot({ path: resolve('../docs/images/urip-detalhe-320.png') });
  await page.getByRole('button', { name: 'Ver origem e confiança', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Origem e confiança', exact: true })).toBeVisible();
  await expect(page.getByText('(base × 4 + likes) / (4 + likes + dislikes)', { exact: true })).toBeVisible();
  await page.screenshot({ path: resolve('../docs/images/urip-origem-320.png') });
  await page.getByRole('button', { name: 'Voltar ao alerta', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Detalhe da ocorrência', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Voltar à lista de origem', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Central de notificações', exact: true })).toBeVisible();
  await expect(page.getByText('Lido', { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: resolve('../docs/images/urip-central-320.png') });
  await page.reload();
  await expect(page.getByText('Conectado', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Avisos', exact: true }).click();
  await expect(page.getByText('Lido', { exact: true }).first()).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(overflow).toBe(false);
});
