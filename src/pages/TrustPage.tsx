import { Shield, Lock, Database, FileCheck, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TrustPage() {
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Segurança e Privacidade</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Esta página é mantida pela equipe da BNP para responder perguntas comuns sobre como
            tratamos segurança e privacidade no BNP Hub. O conteúdo é editável pelo proprietário
            do aplicativo e não constitui certificação independente.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lock className="h-5 w-5" /> Acesso e autenticação
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>O BNP Hub é um aplicativo interno: o acesso requer login com credenciais individuais.</p>
            <p>Controles de acesso baseados em papéis (RBAC) limitam o que cada usuário pode ver e fazer.</p>
            <p>Dados sensíveis são protegidos por Row Level Security no banco de dados.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-5 w-5" /> Hospedagem e infraestrutura
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              O aplicativo é hospedado na plataforma Lovable Cloud, que fornece banco de dados
              gerenciado, autenticação e armazenamento de arquivos. As capacidades de plataforma
              descritas aqui são fornecidas pela Lovable e não representam certificação independente.
            </p>
            <p>O tráfego com o backend usa HTTPS.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileCheck className="h-5 w-5" /> Coleta e uso de dados
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Coletamos apenas os dados necessários para a operação do produto: informações de
              contratos, clientes, recursos humanos e usuários autorizados.
            </p>
            <p>
              Dados são usados exclusivamente para operação do BNP Hub e não são compartilhados com
              terceiros, exceto integrações configuradas pelo proprietário (ex.: Feedz, Superlogica).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5" /> Contato de segurança
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Para reportar uma vulnerabilidade ou dúvida sobre privacidade, entre em contato com a
              equipe administrativa da BNP através do canal interno.
            </p>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center pt-4">
          Última atualização: junho de 2026
        </p>
      </div>
    </div>
  );
}
