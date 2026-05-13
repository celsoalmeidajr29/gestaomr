<?php
/**
 * Verifica se o usuário atual tem tokens Google válidos.
 * GET → { "connected": bool, "needs_refresh": bool }
 * DELETE → desconecta (revoga e apaga token)
 */

declare(strict_types=1);
require_once __DIR__ . '/../../../_bootstrap.php';
require_once __DIR__ . '/../_google.php';

$u      = require_auth();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    if (_cerebro_slots_enabled()) {
        // Lê ambos os slots de uma vez
        $stmt = db()->prepare(
            'SELECT slot, email, access_token, refresh_token, expires_at
               FROM cerebro_tokens WHERE usuario_id = :uid AND slot IN (0,1)'
        );
        $stmt->execute([':uid' => $u['id']]);
        $rows = [];
        while ($row = $stmt->fetch()) $rows[(int) $row['slot']] = $row;

        $slots = [];
        for ($s = 0; $s <= 1; $s++) {
            if (!isset($rows[$s])) { $slots[$s] = ['connected' => false]; continue; }
            $r = $rows[$s];
            $expired = (int) $r['expires_at'] < time() + 60;
            $slots[$s] = [
                'connected'     => true,
                'needs_refresh' => $expired && empty($r['refresh_token']),
                'email'         => $r['email'] ?? null,
            ];
        }
        json_response(['connected' => !empty($slots[0]['connected']), 'slots' => $slots]);
    } else {
        // Schema antigo (migration 022 não aplicada)
        $token = google_load_token((int) $u['id']);
        if (!$token) { json_response(['connected' => false, 'slots' => [0 => ['connected' => false], 1 => ['connected' => false]]]); }
        $expired = (int) $token['expires_at'] < time() + 60;
        json_response([
            'connected'     => true,
            'needs_refresh' => $expired && empty($token['refresh_token']),
            'slots'         => [0 => ['connected' => true, 'email' => null], 1 => ['connected' => false]],
        ]);
    }
}

if ($method === 'DELETE') {
    $slot  = (int) ($_GET['slot'] ?? 0);
    if ($slot < 0 || $slot > 1) $slot = 0;
    $token = google_load_token((int) $u['id'], $slot);
    if ($token) {
        google_revoke($token['access_token']);
        google_delete_token((int) $u['id'], $slot);
    }
    json_response(['disconnected' => true]);
}

json_error('Método não permitido', 405);
