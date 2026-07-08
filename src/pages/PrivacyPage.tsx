import { Suspense, lazy } from 'react';
import { motion } from 'motion/react';
import Header from '../components/Header';
import SEO from '../components/SEO';

const Footer = lazy(() => import('../components/Footer'));

const EFFECTIVE_DATE = '8 de julho de 2026';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl md:text-2xl font-bold font-display mb-4">{title}</h2>
      <div className="space-y-4 text-zinc-600 dark:text-zinc-400 leading-relaxed text-sm md:text-base font-light">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <>
      <SEO
        title="Política de Privacidade"
        description="Como os dados enviados pelo formulário de contato de vnone.com.br são coletados, usados e protegidos, conforme a LGPD."
        path="/privacidade"
      />
      <Header />
      <main id="main-content" className="pt-32 md:pt-40 pb-24 px-6 md:px-12 bg-brand-white min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 mb-5">
            LGPD · Lei nº 13.709/2018
          </p>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter font-display italic mb-4">
            Política de Privacidade
          </h1>
          <p className="text-zinc-400 text-sm mb-14">Vigente desde {EFFECTIVE_DATE}</p>

          <Section title="1. Quem é o controlador">
            <p>
              Este site (vnone.com.br) é operado por <strong className="text-zinc-900 dark:text-zinc-100 font-medium">Victor Nogueira</strong>,
              que atua como controlador dos dados pessoais tratados aqui. Contato:{' '}
              <a href="mailto:contato@vnone.com.br" className="underline hover:text-black dark:hover:text-white transition-colors">contato@vnone.com.br</a>.
            </p>
          </Section>

          <Section title="2. Quais dados são coletados">
            <p>Ao enviar o formulário de contato, coletamos apenas o que você informa:</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Nome</li>
              <li>E-mail ou número de WhatsApp (conforme o método escolhido)</li>
              <li>Mensagem</li>
            </ul>
            <p>
              Por segurança e prevenção a abuso, também registramos um <strong className="text-zinc-900 dark:text-zinc-100 font-medium">identificador anônimo derivado do seu endereço IP</strong> (um
              hash criptográfico — o IP em si nunca é armazenado) e a identificação do navegador (user-agent).
            </p>
          </Section>

          <Section title="3. Finalidades e bases legais">
            <ul className="list-disc pl-6 space-y-1.5">
              <li>
                <strong className="text-zinc-900 dark:text-zinc-100 font-medium">Responder ao seu contato</strong> — com base no seu consentimento
                (art. 7º, I, da LGPD), dado ao marcar a caixa de aceite no formulário.
              </li>
              <li>
                <strong className="text-zinc-900 dark:text-zinc-100 font-medium">Prevenção a spam e abuso</strong> — com base no legítimo interesse
                (art. 7º, IX, da LGPD), usando o identificador anônimo de IP para limitar envios automatizados.
              </li>
            </ul>
          </Section>

          <Section title="4. Armazenamento e retenção">
            <p>
              Os dados são armazenados em infraestrutura de banco de dados gerenciada (Supabase), com acesso restrito.
              Mantemos os registros de contato por até <strong className="text-zinc-900 dark:text-zinc-100 font-medium">12 meses</strong> após a última
              interação, quando são eliminados — salvo obrigação legal ou relação comercial em andamento.
            </p>
          </Section>

          <Section title="5. Compartilhamento">
            <p>
              Seus dados não são vendidos nem compartilhados para fins de marketing de terceiros. Eles transitam apenas
              pela nossa infraestrutura de hospedagem e pelo sistema interno de notificações que me avisa do seu contato
              por e-mail e WhatsApp.
            </p>
          </Section>

          <Section title="6. Cookies e armazenamento local">
            <p>
              Este site não usa cookies de rastreamento nem ferramentas de analytics. O único dado guardado no seu
              navegador é a preferência de tema (claro/escuro) e de acessibilidade, em armazenamento local, que nunca sai
              do seu dispositivo.
            </p>
          </Section>

          <Section title="7. Seus direitos (art. 18 da LGPD)">
            <p>Você pode, a qualquer momento, solicitar:</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Confirmação da existência de tratamento e acesso aos seus dados</li>
              <li>Correção de dados incompletos, inexatos ou desatualizados</li>
              <li>Eliminação dos seus dados</li>
              <li>Revogação do consentimento</li>
            </ul>
            <p>
              Basta enviar um e-mail para{' '}
              <a href="mailto:contato@vnone.com.br" className="underline hover:text-black dark:hover:text-white transition-colors">contato@vnone.com.br</a> —
              respondo em até 15 dias.
            </p>
          </Section>

          <Section title="8. Atualizações desta política">
            <p>
              Esta política pode ser atualizada para refletir mudanças no site ou na legislação. A data de vigência no
              topo indica a versão atual.
            </p>
          </Section>
        </motion.div>
      </main>

      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </>
  );
}
