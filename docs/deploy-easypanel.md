# Deploy no EasyPanel

O site é estático: o Dockerfile da raiz compila o app (Vite) e serve o resultado com nginx na porta 80. O EasyPanel constrói essa imagem sozinho, a partir do repositório, e aponta o domínio para a porta 80. Não é preciso ter Docker instalado para publicar. Também não há variável de ambiente, banco, volume nem segredo: o `.env.example` explica que tudo que vai num `VITE_` fica público.

Os nomes dos campos abaixo seguem o painel em inglês e podem variar um pouco entre versões do EasyPanel.

## 1. Criar o serviço

1. No projeto, clique em **Create Service** e escolha **App**.
2. **Source**: GitHub. Conecte o repositório `VictorN0gueira/portfolio-victornogueira` e escolha a branch.
   - Produção: `main`, depois de o PR do redesign ser aprovado e mesclado.
   - Teste antes de publicar: crie um segundo serviço com a branch `redesign/vn-one-v2` e um subdomínio de teste (por exemplo `novo.vnone.com.br`).
3. **Build**: escolha **Dockerfile** e deixe o caminho `Dockerfile`. A imagem fixa as versões do Node e do nginx por digest, então duas construções geram os mesmos bytes.
4. **Environment**: deixe vazio.
5. **Domains & Proxy**: informe o domínio (`vnone.com.br` e `www.vnone.com.br`), **porta do proxy 80**, e deixe o HTTPS ligado (Let's Encrypt). O proxy do EasyPanel termina o TLS e repassa HTTP para o container.
6. **Deploy**. A primeira construção leva alguns minutos (instala as dependências e roda `npm run build`).

O container tem `HEALTHCHECK` próprio (`wget` em `127.0.0.1/index.html` a cada 30 s). Se o painel mostrar o serviço como não saudável, veja os logs da construção e do container antes de mexer em qualquer configuração.

## 2. Deploy automático

No serviço, ative o deploy automático por push (webhook do GitHub). Cada push na branch escolhida reconstrói a imagem. O GitHub Actions continua rodando o CI (lint, testes, build, orçamento de peso e e2e) em cada push e pull request: confira que ele está verde antes de mesclar em `main`.

Para voltar a uma versão anterior, reimplante o commit anterior pelo painel (ou reverta o commit na `main`).

## 3. O que conferir depois de publicar

Troque `SEU_DOMINIO` e rode:

```bash
curl -sI https://SEU_DOMINIO/ | grep -iE "^(HTTP|cache-control|content-security-policy|x-frame-options|x-content-type-options|referrer-policy|permissions-policy)"
curl -s -o /dev/null -w "%{http_code}\n" https://SEU_DOMINIO/sobre           # 200: toda rota do app devolve a mesma página
curl -s -o /dev/null -w "%{http_code}\n" https://SEU_DOMINIO/.env            # 403: arquivos com ponto nunca são servidos
curl -s -o /dev/null -w "%{http_code}\n" https://SEU_DOMINIO/projetos/troco  # 301 para /projetos
```

Abra o site no celular e no computador, role a home inteira, abra o menu, navegue só com o teclado e confira o botão do WhatsApp (canto inferior esquerdo) e o de acessibilidade (direito). Um envio real do formulário cria um lead de verdade no n8n: só faça com o seu aval, uma vez em cada caminho (e-mail e WhatsApp).

## 4. Decisões que ficam com o dono

- **HSTS** (`Strict-Transport-Security`). O container fala HTTP atrás do proxy, então o cabeçalho tem de sair de quem termina o TLS. Se o EasyPanel não permitir adicionar cabeçalhos no proxy do seu serviço, a alternativa é ligar o cabeçalho no próprio nginx: é uma mudança pequena, incluir `HSTS_VALUE` em `SECURITY_HEADERS` no `config/securityHeaders.mjs`, rodar `npm run headers` e ajustar o teste que fixa a lista de cabeçalhos. Hoje o `nginx/security-headers.conf` só traz a linha como comentário. Antes de ligar, confirme que todos os subdomínios de `vnone.com.br` respondem por HTTPS, porque o valor atual inclui `includeSubDomains`.
- **Usuário do nginx.** O processo mestre roda como root, como na imagem oficial. Trocar por `nginx-unprivileged` muda a porta para 8080, e então a porta do proxy também muda.
- **GitHub Pages.** O `.github/workflows/deploy.yml` publica uma cópia em GitHub Pages, mas só roda quando alguém manda (gatilho manual). O site oficial é o do EasyPanel. Para usar a cópia, ative o Pages em Settings, Pages, fonte "GitHub Actions", e rode o workflow à mão. O CI (`ci.yml`) roda em todo push na `main` e em todo pull request.
- **n8n.** O formulário envia direto do navegador para `https://n8n.vnone.com.br/webhook/portfolio-vn-email` e `.../portfolio-vn-whatsapp`. Atualize os filtros do `servico` (a opção "Agente de IA ou chatbot" passou a "Agente de IA") e trate `nome`, `mensagem` e `servico` como não confiáveis (escape de HTML no e-mail, lista fechada para `servico`, limite de requisições).

## 5. Teste local da imagem (opcional)

Só para quem quer ensaiar antes de publicar e tem Docker instalado:

```bash
docker build -t vnone .
docker run --rm -p 8080:80 vnone
```

Abra `http://localhost:8080`. Por `localhost` a página carrega normal. Por um IP da rede, o navegador troca `http` por `https` (a política de segurança manda `upgrade-insecure-requests`) e a página fica sem estilo: isso é esperado fora do proxy com TLS.
