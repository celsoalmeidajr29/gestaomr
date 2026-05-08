<?php
/**
 * GET /backend/api/cora/diag-certs.php
 *
 * Diagnóstico de paths dos certificados Cora.
 * Lista candidatos comuns e mostra onde os arquivos estão de fato no servidor.
 * Útil quando o test_auth.php retorna "arquivo cert_path não encontrado/legível".
 *
 * Saída em texto plano para fácil leitura no navegador.
 */

declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';

require_permission('despesas');

header('Content-Type: text/plain; charset=utf-8');

echo "=== DIAGNÓSTICO DE CERTIFICADOS CORA ===\n\n";

echo "Working dir:     " . getcwd() . "\n";
echo "Script dir:      " . __DIR__ . "\n";
echo "Home env:        " . ($_SERVER['HOME'] ?? 'desconhecido') . "\n";
echo "Server software: " . ($_SERVER['SERVER_SOFTWARE'] ?? '?') . "\n";
echo "PHP user (uid):  " . posix_getuid() . " · " . (posix_getpwuid(posix_getuid())['name'] ?? '?') . "\n";

// Detecta home do usuário automaticamente a partir do __DIR__
$home = preg_match('#^(/home/[^/]+)#', __DIR__, $m) ? $m[1] : ($_SERVER['HOME'] ?? '/home');
echo "Home detectado:  {$home}\n\n";

// Lê variáveis configuradas no .env
echo "=== VARIÁVEIS DO .ENV (Cora) ===\n";
foreach (['CORA_MR_CERT_PATH', 'CORA_MR_KEY_PATH', 'CORA_UP_CERT_PATH', 'CORA_UP_KEY_PATH'] as $v) {
    $val = (string) env($v, '');
    $existe = $val && is_readable($val);
    echo sprintf("%-22s = %s\n", $v, $val ?: '(vazio)');
    echo sprintf("%-22s   %s\n", '', $val === '' ? '(não configurado)' : ($existe ? '✓ legível' : '✗ não encontrado'));
}

echo "\n=== BUSCA EM CAMINHOS COMUNS ===\n";

$arquivos = [
    'cora-certs/mr-assessoria/certificate.pem',
    'cora-certs/mr-assessoria/private-key.key',
    'cora-certs/up-vigilancia/certificate.pem',
    'cora-certs/up-vigilancia/private-key.key',
];

$prefixos = [
    "{$home}",
    "{$home}/files",
    "{$home}/public_html",
    "{$home}/domains",
    "{$home}/domains/celso.cloud",
    "{$home}/domains/celso.cloud/public_html",
    "{$home}/domains/celso.cloud/private",
    dirname(__DIR__, 4),                                     // sobe 4 níveis a partir desta pasta
    dirname(__DIR__, 4) . '/cora-certs',
    dirname(__DIR__, 3),
];
$prefixos = array_unique(array_filter($prefixos));

foreach ($arquivos as $arq) {
    echo "\n[ {$arq} ]\n";
    $achou = false;
    foreach ($prefixos as $p) {
        $full = rtrim($p, '/') . '/' . $arq;
        if (is_readable($full)) {
            echo "  ✓ {$full}\n";
            echo "    realpath: " . realpath($full) . "\n";
            $achou = true;
        }
    }
    if (!$achou) echo "  ✗ não encontrado em nenhum prefixo testado\n";
}

echo "\n=== LISTAGEM DE PASTAS PRINCIPAIS ===\n";

$pastasListar = [
    $home,
    "{$home}/cora-certs",
    "{$home}/files",
    "{$home}/public_html",
    "{$home}/domains",
    "{$home}/domains/celso.cloud",
    "{$home}/domains/celso.cloud/cora-certs",
    "{$home}/domains/celso.cloud/private",
    "{$home}/domains/celso.cloud/public_html",
];
foreach ($pastasListar as $p) {
    echo "\n[{$p}]\n";
    if (!is_dir($p)) {
        echo "  (não é diretório)\n";
        continue;
    }
    $itens = @scandir($p);
    if ($itens === false) {
        echo "  (sem permissão de leitura)\n";
        continue;
    }
    foreach ($itens as $f) {
        if ($f === '.' || $f === '..') continue;
        $full = $p . '/' . $f;
        echo "  - " . $f . (is_dir($full) ? '/' : '') . "\n";
    }
}

echo "\n=== BUSCA RECURSIVA POR .pem E .key NO HOME ===\n";
echo "(limita 50 resultados, ignora cache/git/node_modules)\n\n";

$encontrados = 0;
$ignorar = ['.cagefs', '.cl.selector', '.filebrowser', '.logs', 'cache', 'node_modules', '.git', 'tmp'];
try {
    $iter = new RecursiveIteratorIterator(
        new RecursiveCallbackFilterIterator(
            new RecursiveDirectoryIterator($home, RecursiveDirectoryIterator::SKIP_DOTS | FilesystemIterator::FOLLOW_SYMLINKS),
            function ($curr) use ($ignorar) {
                $base = $curr->getBasename();
                if (in_array($base, $ignorar, true)) return false;
                return true;
            }
        ),
        RecursiveIteratorIterator::LEAVES_ONLY
    );
    foreach ($iter as $f) {
        if ($encontrados >= 50) { echo "  ... (limite de 50 atingido)\n"; break; }
        $name = $f->getBasename();
        if (preg_match('/\.(pem|key|crt|p12|pfx)$/i', $name)) {
            echo "  - " . $f->getPathname() . " (" . $f->getSize() . " bytes)\n";
            $encontrados++;
        }
    }
    if ($encontrados === 0) echo "  Nenhum arquivo .pem/.key/.crt/.p12/.pfx encontrado em todo o home.\n";
} catch (Throwable $e) {
    echo "  Erro durante busca: " . $e->getMessage() . "\n";
}

echo "\n=== FIM ===\n";
echo "Apague este arquivo após o diagnóstico:\n";
echo "  api/cora/diag-certs.php\n";
