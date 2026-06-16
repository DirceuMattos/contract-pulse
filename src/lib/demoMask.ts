// Listas de nomes fictícios consistentes (mesmo ID sempre gera mesmo nome)
const CLIENTES_FICTÍCIOS = ['Alpha Sistemas', 'Beta Tecnologia', 'Gamma Digital', 'Delta Soluções', 'Epsilon Tech', 'Zeta Inovação', 'Eta Consultoria', 'Theta Serviços', 'Iota Desenvolvimento', 'Kappa Software'];
const CONTRATOS_FICTÍCIOS = ['Contrato 001', 'Contrato 002', 'Contrato 003', 'Contrato 004', 'Contrato 005', 'Contrato 006', 'Contrato 007', 'Contrato 008', 'Contrato 009', 'Contrato 010'];
const PRIMEIROS_NOMES = ['Carlos', 'Ana', 'João', 'Maria', 'Pedro', 'Juliana', 'Lucas', 'Fernanda', 'Rafael', 'Beatriz', 'Gustavo', 'Camila', 'Bruno', 'Larissa', 'Thiago'];
const SOBRENOMES = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Costa', 'Ferreira', 'Alves', 'Pereira', 'Rodrigues'];

// Função determinística: mesmo ID sempre retorna mesmo índice
function hashIndex(id: string, length: number): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % length;
}

export function maskClientName(id: string): string {
  return CLIENTES_FICTÍCIOS[hashIndex(id, CLIENTES_FICTÍCIOS.length)];
}

export function maskContractName(id: string): string {
  return CONTRATOS_FICTÍCIOS[hashIndex(id, CONTRATOS_FICTÍCIOS.length)];
}

export function maskPersonName(id: string): string {
  const primeiro = PRIMEIROS_NOMES[hashIndex(id, PRIMEIROS_NOMES.length)];
  const sobrenome = SOBRENOMES[hashIndex(id + 'x', SOBRENOMES.length)];
  return `${primeiro} ${sobrenome}`;
}

export function maskPersonEmail(id: string, nome: string): string {
  return `${nome.toLowerCase().replace(' ', '.')}@empresa.com.br`;
}

export function maskFinancialValue(value: number): number {
  // Mantém ordem de grandeza mas embaralha o valor
  const factor = 0.7 + (Math.abs(hashIndex(String(value), 60)) / 100);
  return Math.round(value * factor);
}
