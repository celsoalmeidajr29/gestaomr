<?php
/**
 * GET /api/auth/me.php
 *
 * Retorna o usuário atualmente logado (consulta sessão + tabela `usuarios`).
 * Útil pro frontend recuperar estado após refresh sem precisar guardar dados.
 *
 * Sucesso 200: { ok: true, data: { usuario, csrf_token } }
 * Falha 401:   { ok: false, error: "Não autenticado" }
 */

declare(strict_types=1);

require_once __DIR__ . '/../../_bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    json_error('Método não permitido', 405);
}

$u = require_auth();

json_response([
    'usuario' => [
        'id' => (int) $u['id'],
        'nome' => $u['nome'],
        'email' => $u['email'],
        'status' => $u['status'],
        'perfil_id' => (int) $u['perfil_id'],
        'perfil_codigo' => $u['perfil_codigo'],
        'perfil_nome' => $u['perfil_nome'],
        'permissoes' => $u['permissoes'],
    ],
    'csrf_token' => csrf_token(),
]);
