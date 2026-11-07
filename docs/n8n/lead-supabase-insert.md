# Passo a passo: salvar os leads no Supabase pelo n8n

Este documento descreve como adicionar um nó Postgres ao fluxo do n8n para gravar uma cópia de cada lead na tabela `public.leads` do Supabase da VN One. O n8n ainda envia o e-mail, a planilha e o alerta exatamente como antes: o nó novo fica em série no meio do fluxo e não bloqueia nada em caso de falha.

## Pré-requisitos

- Papel `n8n_leads` criado e senha configurada no Supabase (ver `docs/supabase.md`)
- Dados de conexão em `Acessos/n8n-leads-role.md`:
  - Host interno: `utilitarios-supabase-pooler`
  - Porta: `6543`
  - Banco: `postgres`
  - Usuário: `n8n_leads.vnone` (ou o formato `postgres.vnone` dependendo do pooler)
  - SSL: desligado (a conexão fica dentro do EasyPanel)

## Credencial

Crie uma credencial do tipo **Postgres** com o nome exato `Postgres - VN One leads (n8n_leads)` e os dados acima. Nenhum valor de senha ou token entra neste documento.

## Restrições do papel

O papel `n8n_leads` só pode inserir. Por isso o nó **deve** ter:

- **Output Columns: vazio** — qualquer `RETURNING` exige `select`, que é negado. O nó não devolve linha alguma.
- **Sem "Ignore Conflicts" ou ON CONFLICT** — a opção de ignorar duplicados gera `ON CONFLICT (protocolo)`, que também exige `select` para ler o índice. Um `protocolo` repetido dá erro de chave única, e o `onError: continueRegularOutput` segue o fluxo sem parar.
- **Sem mapear `id` nem `criado_em`** — o banco preenche os dois.

## Onde colocar o nó

Fluxo de e-mail e fluxo de WhatsApp têm estruturas parecidas:

```
Webhook → Mapper → [Postgres - VN One leads] → Delay → Enviar e-mail / alerta / planilha
```

O nó de inserção fica logo depois do nó "Mapper" e antes dos nós de espera. Como o nó não devolve linha, ligue-o com a opção **Return Output of Previous Node** ativada. Assim os nós seguintes continuam lendo `$json` do nó "Mapper" (nome, e-mail, mensagem etc.) sem precisar de ajuste.

## Configuração do nó (fluxo de e-mail)

```json
{
  "id": "postgres-leads-email",
  "name": "Postgres - VN One leads (email)",
  "type": "n8n-nodes-base.postgres",
  "typeVersion": 2.5,
  "parameters": {
    "operation": "insert",
    "schema": "public",
    "table": "leads",
    "returnFields": "",
    "onError": "continueRegularOutput",
    "options": {
      "returnOutput": true
    },
    "columns": {
      "mappingMode": "defineBelow",
      "value": {
        "protocolo": "={{ String($json.protocolo ?? '').replace(/[\\u0000-\\u001f\\u007f-\\u009f\\u2028\\u2029\\u00a0]/g, ' ').replace(/ +/g, ' ').trim().slice(0, 100) }}",
        "canal": "email",
        "nome": "={{ String($json.body.nome ?? '').replace(/[\\u0000-\\u001f\\u007f-\\u009f\\u2028\\u2029\\u00a0]/g, ' ').replace(/ +/g, ' ').trim().slice(0, 200) }}",
        "email": "={{ String($json.body.email ?? '').replace(/[\\u0000-\\u001f\\u007f-\\u009f\\u2028\\u2029\\u00a0]/g, '').trim().slice(0, 320) || null }}",
        "whatsapp": null,
        "servico": "={{ (String($json.body.servico ?? '') || 'Não informado').replace(/[\\u0000-\\u001f\\u007f-\\u009f\\u2028\\u2029\\u00a0]/g, ' ').replace(/ +/g, ' ').trim().slice(0, 200) }}",
        "mensagem": "={{ String($json.body.mensagem ?? '').replace(/[\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f-\\u009f]/g, '').slice(0, 5000) }}",
        "enviado_em": "={{ Number.isNaN(Date.parse($json.body.timestamp)) ? null : new Date($json.body.timestamp).toISOString() }}"
      }
    }
  },
  "credentials": {
    "postgres": {
      "id": "",
      "name": "Postgres - VN One leads (n8n_leads)"
    }
  }
}
```

## Configuração do nó (fluxo de WhatsApp)

```json
{
  "id": "postgres-leads-whatsapp",
  "name": "Postgres - VN One leads (whatsapp)",
  "type": "n8n-nodes-base.postgres",
  "typeVersion": 2.5,
  "parameters": {
    "operation": "insert",
    "schema": "public",
    "table": "leads",
    "returnFields": "",
    "onError": "continueRegularOutput",
    "options": {
      "returnOutput": true
    },
    "columns": {
      "mappingMode": "defineBelow",
      "value": {
        "protocolo": "={{ String($json.protocolo ?? '').replace(/[\\u0000-\\u001f\\u007f-\\u009f\\u2028\\u2029\\u00a0]/g, ' ').replace(/ +/g, ' ').trim().slice(0, 100) }}",
        "canal": "whatsapp",
        "nome": "={{ String($json.body.nome ?? '').replace(/[\\u0000-\\u001f\\u007f-\\u009f\\u2028\\u2029\\u00a0]/g, ' ').replace(/ +/g, ' ').trim().slice(0, 200) }}",
        "email": null,
        "whatsapp": "={{ String($json.body.whatsapp ?? '').replace(/[\\u0000-\\u001f\\u007f-\\u009f\\u2028\\u2029\\u00a0]/g, '').trim().slice(0, 32) || null }}",
        "servico": "={{ (String($json.body.servico ?? '') || 'Não informado').replace(/[\\u0000-\\u001f\\u007f-\\u009f\\u2028\\u2029\\u00a0]/g, ' ').replace(/ +/g, ' ').trim().slice(0, 200) }}",
        "mensagem": "={{ String($json.body.mensagem ?? '').replace(/[\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f-\\u009f]/g, '').slice(0, 5000) }}",
        "enviado_em": "={{ Number.isNaN(Date.parse($json.body.timestamp)) ? null : new Date($json.body.timestamp).toISOString() }}"
      }
    }
  },
  "credentials": {
    "postgres": {
      "id": "",
      "name": "Postgres - VN One leads (n8n_leads)"
    }
  }
}
```

## O que as expressões fazem

Todos os campos são guardados como a pessoa digitou — HTML, links e símbolos incluídos. As expressões só removem o que quebraria o banco ou um cabeçalho de e-mail:

- **Campos de uma linha** (`protocolo`, `nome`, `email`, `whatsapp`, `servico`): os caracteres de controle C0, DEL, C1, U+2028 e U+2029 são trocados por espaço (ou descartados em `email` e `whatsapp`), espaços duplos colapsam, e o campo é cortado no limite da coluna.
- **Mensagem**: só o caractere nulo e os controles não imprimíveis (exceto CR, LF e TAB) são removidos; quebras de linha ficam. Cortado em 5000 caracteres.
- **Data**: só entra se o `timestamp` que veio do formulário for uma data válida.

**Em cada lugar que mostrar esses dados — e-mail, planilha, página —, escape cada campo antes de exibir. Os dados ficam crus na tabela e nunca devem ser confiados.**

## Teste de aceitação

Faça o teste de aceitação apenas com o ok do dono, no fluxo de produção:

1. Envie um lead de teste pelo site (pelo formulário real, não pelo n8n).
2. No Studio do Supabase, confirme que a linha aparece na tabela `leads` **antes** de o e-mail de resposta sair.
3. Desconecte a credencial `Postgres - VN One leads (n8n_leads)` no n8n (simulando o Supabase fora do ar).
4. Envie outro lead de teste.
5. Confirme que o e-mail, a planilha e o alerta continuam saindo, e que o nó Postgres mostra erro mas o fluxo segue.
6. Reconecte a credencial.
