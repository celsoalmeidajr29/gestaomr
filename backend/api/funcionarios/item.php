<?php
declare(strict_types=1);
require_once __DIR__ . '/../../_bootstrap.php';

require_permission('funcionarios');
$method = $_SERVER['REQUEST_METHOD'];
$id = (int) ($_GET['id'] ?? 0);
if (!$id) {
    json_error('Parâmetro id obrigatório', 400);
}

if ($method === 'GET') {
    $func = db()->query("SELECT * FROM funcionarios WHERE id = {$id}")->fetch();
    if (!$func) {
        json_error('Funcionário não encontrado', 404);
    }
    $arqs = db()->query(
        "SELECT id, tipo, nome_original, caminho, mime_type, tamanho_bytes, descricao
         FROM arquivos WHERE entidade_tipo='funcionario' AND entidade_id={$id}
         ORDER BY tipo, id"
    )->fetchAll();
    $func['arquivos'] = $arqs;
    json_response($func);
}

if ($method === 'PUT' || $method === 'PATCH') {
    $d = json_input();
    if (empty($d['nome'])) {
        json_error('Campo obrigatório: nome', 422);
    }
    $stmt = db()->prepare(
        'UPDATE funcionarios SET codigo_externo=:ce, nome=:nome, categoria=:cat, funcao=:funcao,
         cpf=:cpf, rg=:rg, data_nascimento=:dn, estado_civil=:ec,
         nacionalidade=:nac, naturalidade=:nat, telefone=:tel, email=:email,
         endereco=:end, cep=:cep, cidade=:cidade, uf=:uf,
         salario_fixo=:sal, valor_diaria=:diaria, folha_grupo=:fgrupo,
         tipo_pix=:tipopix, chave_pix=:pix,
         data_admissao=:admissao, data_demissao=:demissao,
         notas=:notas, status=:status
         WHERE id=:id'
    );
    $stmt->execute([
        ':ce'      => $d['codigo_externo'] ?? null,
        ':nome'    => $d['nome'],
        ':cat'     => $d['categoria'] ?? 'Operacional',
        ':funcao'  => $d['funcao'] ?? null,
        ':cpf'     => $d['cpf'] ?? null,
        ':rg'      => $d['rg'] ?? null,
        ':dn'      => $d['data_nascimento'] ?? null,
        ':ec'      => $d['estado_civil'] ?? null,
        ':nac'     => $d['nacionalidade'] ?? 'Brasileira',
        ':nat'     => $d['naturalidade'] ?? null,
        ':tel'     => $d['telefone'] ?? null,
        ':email'   => $d['email'] ?? null,
        ':end'     => $d['endereco'] ?? null,
        ':cep'     => $d['cep'] ?? null,
        ':cidade'  => $d['cidade'] ?? null,
        ':uf'      => $d['uf'] ?? null,
        ':sal'     => $d['salario_fixo'] ?? 0,
        ':diaria'  => $d['valor_diaria'] ?? 0,
        ':fgrupo'  => $d['folha_grupo'] ?: null,
        ':tipopix' => $d['tipo_pix'] ?? 'CPF',
        ':pix'     => $d['chave_pix'] ?? null,
        ':admissao'=> $d['data_admissao'] ?? null,
        ':demissao'=> $d['data_demissao'] ?? null,
        ':notas'   => $d['notas'] ?? null,
        ':status'  => $d['status'] ?? 'ATIVO',
        ':id'      => $id,
    ]);
    $row = db()->query("SELECT * FROM funcionarios WHERE id = {$id}")->fetch();
    json_response($row);
}

if ($method === 'DELETE') {
    $stmt = db()->prepare("UPDATE funcionarios SET status='INATIVO' WHERE id=:id");
    $stmt->execute([':id' => $id]);
    json_response(['id' => $id, 'status' => 'INATIVO']);
}

json_error('Método não permitido', 405);
