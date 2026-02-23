import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PersonData {
  n: string; tv: string; c: string; d: string;
  rm: number; b: number; obs: string | null; cg: string | null;
  la: string | null; da: string | null; sit: string;
  dd: string | null; td: string | null; od: string | null;
  nv: string | null; tr: string | null; pj: string | null;
  ca: string | null; rii: number | null;
}

interface TimelineData {
  name: string; date: string; valor: string; desc: string | null;
}

const people: PersonData[] = [
  // Row 7-16
  {n:"Jhonathan Costa Chaves",tv:"clt",c:"Administrador de Redes",d:"Suporte",rm:5875.5,b:0,obs:null,cg:null,la:"SAESA",da:"2021-06-01",sit:"inativo",dd:"2026-01-15",td:"solicitou-dispensa",od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:"Analista de Suporte Pleno",rii:5875.5},
  {n:"Vitor Prado",tv:"clt",c:"Administrador de Redes",d:"SRE",rm:6890.97,b:0,obs:null,cg:null,la:"BNP/Via Luz",da:"2024-01-08",sit:"inativo",dd:"2026-01-15",td:"dispensado",od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:"Administrador de Redes Pleno",rii:6890.97},
  {n:"Mário Andrade da Silva",tv:"pj",c:"Administrador de Redes",d:"Suporte",rm:8126.73,b:0,obs:null,cg:null,la:"SCEIC",da:"2021-04-05",sit:"ativo",dd:null,td:null,od:null,nv:"N3 - Senior",tr:"Técnica",pj:null,ca:"Administrador de Redes",rii:8524.13},
  {n:"Katia Cristina Salemme da Silva",tv:"clt",c:"Analista Administrativo",d:"Administrativo",rm:4358.43,b:0,obs:"Revisão de valores",cg:"Avaliar fev/26",la:"BNP",da:"2015-02-02",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Gestão",pj:null,ca:"Analista Administrativo",rii:4532.77},
  {n:"Gutemberg Rodrigues",tv:"pj",c:"Analista de Dados",d:"Dados",rm:3500,b:0,obs:"Dispensar - 1a semana fev/26 - autorizado 4k - pg retro (?)",cg:null,la:"BNP",da:"2024-12-17",sit:"inativo",dd:"2026-02-06",td:"dispensado",od:null,nv:"N1 - Junior",tr:"Técnica",pj:null,ca:"Analista de Dados",rii:3500},
  {n:"Janaina Rodrigues Valim",tv:"clt",c:"Analista de Dados",d:"Dados",rm:3478.36,b:500,obs:"Sindical - Aguardar Índice para aplicação",cg:null,la:"BNP",da:"2022-02-01",sit:"inativo",dd:"2026-02-20",td:"solicitou-dispensa",od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:"Analista de Dados",rii:3617.49},
  {n:"Leticia Oliveira Vieira",tv:"pj",c:"Analista de Dados",d:"Dados",rm:7000,b:0,obs:null,cg:null,la:"BNP",da:"2024-12-18",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:"Analista de Dados",rii:7298.2},
  {n:"Danielle de Lima Silva",tv:"pj",c:"Analista de Dados",d:"Dados",rm:11000,b:0,obs:null,cg:null,la:"SCEIC",da:"2025-01-13",sit:"inativo",dd:"2025-06-06",td:"solicitou-dispensa",od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:"Analista de Governança de Dados",rii:11000},
  {n:"Fabio Zanin Domingues",tv:"clt",c:"Analista de Dados",d:"Dados",rm:3200,b:0,obs:null,cg:null,la:"BNP",da:"2024-03-04",sit:"ativo",dd:null,td:null,od:null,nv:"N1 - Junior",tr:"Técnica",pj:null,ca:"Analista de Suporte Junior",rii:3328},
  {n:"Mauro Cicero dos Santos",tv:"pj",c:"Analista de Implantação",d:"Desenvolvimento",rm:60,b:0,obs:null,cg:null,la:"BNP",da:"2024-04-01",sit:"ativo",dd:null,td:null,od:null,nv:"N1 - Junior",tr:"Técnica",pj:null,ca:"Analista de Implantação",rii:3600},
  // Row 17-26
  {n:"Giuliano Maddaluno Borini Artero",tv:"pj",c:"Analista de Implantação",d:"Desenvolvimento",rm:6000,b:0,obs:"Aniversário empresa",cg:"avaliar Fev/26",la:"BNP",da:"2024-12-02",sit:"ativo",dd:null,td:null,od:null,nv:"N1 - Junior",tr:"Técnica",pj:null,ca:"Analista de Implantação",rii:6000},
  {n:"Moisés Martinez Rodrigues",tv:"clt",c:"Analista de Infraestrutura",d:"Suporte",rm:3014.73,b:300,obs:"Sindical - Aguardar Índice para aplicação",cg:null,la:"BNP",da:"2023-02-17",sit:"ativo",dd:null,td:null,od:null,nv:"N1 - Junior 1",tr:"Técnica",pj:null,ca:"Tecnico de informática",rii:3448.85},
  {n:"Anderson Lopes de Oliveira",tv:"clt",c:"Analista de Infraestrutura",d:"Suporte",rm:3834.71,b:300,obs:"Sindical - Aguardar Índice para aplicação",cg:null,la:"BNP/Via Luz",da:"2023-07-17",sit:"ativo",dd:null,td:null,od:null,nv:"N1 - Junior 2",tr:"Técnica",pj:null,ca:"Analista de Suporte",rii:4187.51},
  {n:"Jeferson Franzini",tv:"pj",c:"Analista de Requisitos",d:"Projetos",rm:6000,b:0,obs:null,cg:null,la:"BNP",da:"2025-05-23",sit:"inativo",dd:"2025-12-02",td:"dispensado",od:null,nv:"N2 - Pleno",tr:"Produto/Projeto",pj:null,ca:"Analista de Requisitos",rii:6000},
  {n:"Kelly Rizzo Toledo Cunegundes",tv:"pj",c:"Analista de Requisitos",d:"Projetos",rm:0,b:0,obs:null,cg:null,la:"BNP",da:"2025-06-16",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Produto/Projeto",pj:null,ca:"Analista de Requisitos",rii:6000},
  {n:"Suely Bezerra",tv:"pj",c:"Analista de Requisitos",d:"Projetos",rm:6000,b:0,obs:null,cg:null,la:"SCEIC",da:"2025-02-13",sit:"inativo",dd:"2025-06-20",td:"solicitou-dispensa",od:null,nv:"N2 - Pleno",tr:"Produto/Projeto",pj:null,ca:"Analista de Requisitos",rii:6000},
  {n:"Juliana Serette",tv:"pj",c:"Analista de Requisitos",d:"Projetos",rm:6000,b:0,obs:null,cg:null,la:"SCEIC",da:"2025-02-17",sit:"inativo",dd:"2025-11-18",td:"solicitou-dispensa",od:null,nv:"N2 - Pleno",tr:"Produto/Projeto",pj:null,ca:"Analista de Requisitos",rii:7000},
  {n:"Bruno Benetti",tv:"clt",c:"Analista de SRE",d:"SRE",rm:2545.77,b:300,obs:"Avaliar com a liderança se vem correspondendo na função",cg:"avaliar fev/26",la:"BNP",da:"2024-07-29",sit:"ativo",dd:null,td:null,od:null,nv:"N1 - Junior",tr:"Técnica",pj:null,ca:"Analista de Suporte N1",rii:2647.6},
  {n:"Felipe Lima",tv:"pj",c:"Analista de SRE",d:"SRE",rm:8000,b:0,obs:null,cg:null,la:"BNP",da:"2025-03-20",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:"Analista de SRE",rii:8000},
  {n:"Diogo Veiga Islanio",tv:"clt",c:"Analista de Suporte",d:"Suporte",rm:2184,b:0,obs:"Ver Dissídio RJ | Tem convênio médico subsidiado pela BNP (alto custo)",cg:null,la:"PPSA",da:"2023-09-01",sit:"ativo",dd:null,td:null,od:null,nv:"N1 - Junior",tr:"Técnica",pj:null,ca:"Analista de Suporte",rii:2295.38},
  // Row 27-36
  {n:"Eduardo Alves da Silva",tv:"clt",c:"Analista de Suporte",d:"Suporte",rm:2352.09,b:0,obs:"Equiparar - Dissídio",cg:null,la:"SIURB",da:"2025-05-05",sit:"ativo",dd:null,td:null,od:null,nv:"N1 - Junior",tr:"Técnica",pj:null,ca:"Analista de Suporte N1",rii:2688.4},
  {n:"Amabile Rosa",tv:"clt",c:"Analista de Suporte",d:"Suporte",rm:0,b:0,obs:null,cg:null,la:"BNP",da:"2026-01-05",sit:"ativo",dd:null,td:null,od:null,nv:"N1 - Junior",tr:"Técnica",pj:null,ca:null,rii:2585},
  {n:"Gabriel Almeida da Silva",tv:"clt",c:"Analista de Suporte",d:"Suporte",rm:0,b:0,obs:null,cg:null,la:"Vallair",da:"2025-09-16",sit:"inativo",dd:"2026-02-10",td:"solicitou-dispensa",od:null,nv:"N1 - Junior",tr:"Técnica",pj:null,ca:null,rii:2585},
  {n:"Heloyse Ribeiro",tv:"clt",c:"Analista de Suporte",d:"Suporte",rm:0,b:0,obs:null,cg:null,la:"BNP",da:"2026-01-05",sit:"ativo",dd:null,td:null,od:null,nv:"N1 - Junior",tr:"Técnica",pj:null,ca:null,rii:2585},
  {n:"Karina Cecilia de Campos Fanti",tv:"clt",c:"Analista de Suporte",d:"Suporte",rm:0,b:0,obs:null,cg:null,la:"BNP",da:"2025-06-23",sit:"ativo",dd:null,td:null,od:null,nv:"N1 - Junior",tr:"Técnica",pj:null,ca:"-",rii:2688.4},
  {n:"Victor Costa Bergamin",tv:"clt",c:"Analista de Suporte",d:"Suporte",rm:0,b:0,obs:null,cg:null,la:"BNP",da:"2025-06-23",sit:"ativo",dd:null,td:null,od:null,nv:"N1 - Junior",tr:"Técnica",pj:null,ca:"-",rii:2688.4},
  {n:"Enzo Felipe Martins Cranchi",tv:"clt",c:"Analista de Suporte",d:"Suporte",rm:2595.36,b:0,obs:null,cg:null,la:"BNP",da:"2024-12-06",sit:"ativo",dd:null,td:null,od:null,nv:"N1 - Junior",tr:"Técnica",pj:null,ca:"Analista de Suporte a Sistemas Junior",rii:2699.17},
  {n:"Gabriel Hertel da Silva",tv:"clt",c:"Analista de Suporte",d:"Suporte",rm:2605.7,b:0,obs:null,cg:null,la:"BNP",da:"2024-10-17",sit:"ativo",dd:null,td:null,od:null,nv:"N1 - Junior",tr:"Técnica",pj:null,ca:"Analista de Suporte N1",rii:2709.93},
  {n:"Gustavo de Oliveira Souza Ramos",tv:"clt",c:"Analista de Suporte",d:"Suporte",rm:2615.78,b:300,obs:null,cg:null,la:"SCEIC",da:"2024-10-08",sit:"ativo",dd:null,td:null,od:null,nv:"N1 - Junior",tr:"Técnica",pj:null,ca:"Analista de Suporte a Sistemas Junior",rii:2720.41},
  {n:"Michelle Pedroso Rodrigues",tv:"clt",c:"Analista de Suporte",d:"Suporte",rm:2615.78,b:500,obs:"Transição para equipe QA até março 25 | VA bonificação ref atuação como Tester - R$200/mês quando atua como tester",cg:"avaliar fev/26",la:"SCEIC/Via Luz",da:"2024-10-14",sit:"ativo",dd:null,td:null,od:null,nv:"N1 - Junior",tr:"Técnica",pj:null,ca:"Analista de Suporte a Sistemas Junior",rii:2615.78},
  // Row 37-46
  {n:"Wesley Sabino Siqueira da Silva",tv:"clt",c:"Analista de Suporte",d:"Suporte",rm:2672.28,b:0,obs:null,cg:null,la:"SAESA",da:"2024-06-10",sit:"ativo",dd:null,td:null,od:null,nv:"N1 - Junior",tr:"Técnica",pj:null,ca:"Analista de Suporte",rii:2779.17},
  {n:"Vitor de Mello Pena",tv:"clt",c:"Analista de Suporte",d:"Suporte",rm:2969.31,b:0,obs:null,cg:null,la:"BNP",da:"2024-07-16",sit:"ativo",dd:null,td:null,od:null,nv:"N1 - Junior",tr:"Técnica",pj:null,ca:"Analista de Suporte Técnico",rii:3088.08},
  {n:"Guilherme Pereira Grangeiro",tv:"clt",c:"Analista de Suporte",d:"Suporte",rm:2996.42,b:0,obs:null,cg:null,la:"SAESA",da:"2024-01-08",sit:"ativo",dd:null,td:null,od:null,nv:"N1 - Junior",tr:"Técnica",pj:null,ca:"Analista de Suporte",rii:3116.28},
  {n:"Emiliano Gil Santos de Brito",tv:"clt",c:"Analista de Suporte",d:"Suporte",rm:3050.9,b:0,obs:null,cg:null,la:"OMEL",da:"2023-01-05",sit:"ativo",dd:null,td:null,od:null,nv:"N1 - Junior",tr:"Técnica",pj:null,ca:"Analista de Suporte",rii:3172.94},
  {n:"Tadeu Pinheiro Bolognes",tv:"clt",c:"Analista de Suporte",d:"Suporte",rm:3172.94,b:0,obs:"Sindical - Aguardar Índice para aplicação",cg:null,la:"MITSUI",da:"2021-12-06",sit:"ativo",dd:null,td:null,od:null,nv:"N1 - Junior",tr:"Técnica",pj:null,ca:"Analista de Suporte",rii:3299.86},
  {n:"Juan Canuto Ramos Machado",tv:"clt",c:"Analista de Suporte",d:"Suporte",rm:3227.02,b:0,obs:"Sindical - Aguardar Índice para aplicação",cg:null,la:"SIURB",da:"2024-11-14",sit:"ativo",dd:null,td:null,od:null,nv:"N1 - Junior",tr:"Técnica",pj:null,ca:"Analista de Suporte N1",rii:3356.1},
  {n:"Evanilson Carvalho Sousa",tv:"pj",c:"Analista de Suporte",d:"Suporte",rm:4526.28,b:0,obs:null,cg:null,la:"SCEIC",da:"2021-04-05",sit:"ativo",dd:null,td:null,od:null,nv:"N1 - Junior",tr:"Técnica",pj:null,ca:"Analista de Suporte",rii:4747.61},
  {n:"Lais Lenne Silva Lima",tv:"pj",c:"Analista de Suporte",d:"Suporte",rm:5000,b:0,obs:null,cg:"avaliar abr/26",la:"SMC",da:"2025-04-22",sit:"ativo",dd:null,td:null,od:null,nv:"N1 - Junior",tr:"Técnica",pj:null,ca:"Suporte a sistemas",rii:5000},
  {n:"Teodoro Martins",tv:"pj",c:"Analista de Suporte",d:"Suporte",rm:5000,b:0,obs:"Transf SEC - $ 6K Analista Implantação",cg:"avaliar fev/26",la:"SMC",da:"2025-03-31",sit:"ativo",dd:null,td:null,od:null,nv:"N1 - Junior",tr:"Técnica",pj:null,ca:"Suporte a sistemas",rii:5000},
  {n:"Diego dos Santos Esmerino",tv:"clt",c:"Analista de Suporte",d:"Suporte",rm:3050.9,b:200,obs:"Transição para equipe QA até março 25 | VA bonificação ref atuação como Tester - R$200/mês quando atua como tester",cg:"avaliar fev/26",la:"SCEIC/Via Luz",da:"2022-10-11",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:"Analista de Suporte Pleno",rii:3172.94},
  // Row 47-56
  {n:"Everson dos Santos Esmerino",tv:"clt",c:"Analista de Suporte",d:"Suporte",rm:3227.02,b:0,obs:null,cg:null,la:"SIURB",da:"2023-05-02",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:"Analista de Suporte Pleno",rii:3356.1},
  {n:"Wesley Martins",tv:"clt",c:"Analista de Suporte",d:"Suporte",rm:3247.87,b:0,obs:null,cg:null,la:"BNP",da:"2020-03-04",sit:"inativo",dd:"2025-04-25",td:"dispensado",od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:"Analista de Suporte Pleno",rii:3247.87},
  {n:"Rafael Paulino",tv:"clt",c:"Analista de Suporte",d:"Suporte",rm:5000,b:0,obs:null,cg:null,la:"GALUTTI",da:"2016-06-01",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:"Analista Suporte Pleno",rii:4160},
  {n:"Kaique Alberto",tv:"pj",c:"Analista de Suporte",d:"Suporte",rm:4680,b:0,obs:null,cg:null,la:"SIURB",da:"2023-07-17",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:"Analista de Suporte",rii:4924.76},
  {n:"Wellington Junior",tv:"pj",c:"Analista de Suporte",d:"Suporte",rm:5323.52,b:0,obs:null,cg:null,la:"SCEIC",da:"2021-04-05",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:"Analista de Suporte",rii:5583.84},
  {n:"Edwilson de Souza Novais",tv:"pj",c:"Analista de Suporte",d:"Suporte",rm:7500,b:0,obs:null,cg:null,la:"BNP",da:"2022-07-04",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:"Analista de Suporte",rii:7911},
  {n:"Pablo Rainho Figoli",tv:"clt",c:"Analista de Suporte",d:"Suporte",rm:5200,b:0,obs:"Ver Dissídio RJ | Tem convênio médico subsidiado pela BNP (alto custo)",cg:null,la:"PPSA",da:"2023-09-01",sit:"ativo",dd:null,td:null,od:null,nv:"N3 - Senior",tr:"Técnica",pj:null,ca:"Analista de Suporte Senior",rii:5465.2},
  {n:"Kleverton de Sousa Gameleira",tv:"pj",c:"Analista de Testes (QA)",d:"Qualidade",rm:5000,b:0,obs:"Dispensar - 1a semana fev/26",cg:null,la:"BNP",da:"2024-12-03",sit:"ativo",dd:null,td:null,od:null,nv:"N1 - Junior",tr:"Técnica",pj:null,ca:"Analista de Testes Jr",rii:5000},
  {n:"Fernanda Matuda Baccarini",tv:"clt",c:"Analista de Testes (QA)",d:"Qualidade",rm:4190.8,b:500,obs:"Sindical - Aguardar Índice para aplicação",cg:null,la:"BNP/Via Luz",da:"2021-11-04",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:"Analista de Teste Pleno",rii:4358.43},
  {n:"Andrezza Albuquerque Carvalho Domingues",tv:"clt",c:"Analista de Testes(Tester)",d:"Qualidade",rm:3120,b:500,obs:null,cg:null,la:"BNP/Via Luz",da:"2024-07-01",sit:"ativo",dd:null,td:null,od:null,nv:"N1 - Junior",tr:"Técnica",pj:null,ca:"Analista de Testes Junior",rii:3244.8},
  // Row 57-66
  {n:"Pedro Paulo Sanches Figueiredo",tv:"pj",c:"Analista de Testes(Tester)",d:"Desenvolvimento",rm:5000,b:0,obs:null,cg:null,la:"BNP",da:"2025-05-26",sit:"ativo",dd:null,td:null,od:null,nv:"N1 - Junior",tr:"Técnica",pj:null,ca:"Analista de Testes",rii:5000},
  {n:"James Marçal",tv:"pj",c:"Analista de Testes(Tester)",d:"Qualidade",rm:6300,b:0,obs:null,cg:null,la:"BNP",da:"2024-10-14",sit:"inativo",dd:"2026-02-06",td:"dispensado",od:null,nv:"N1 - Junior",tr:"Técnica",pj:null,ca:"Analista de Qualidade",rii:6625.71},
  {n:"Vinicius dos Santos Rocha da Silva",tv:"pj",c:"Assessor de TI",d:"Desenvolvimento",rm:5000,b:0,obs:"Verificar ultimo reaj ou renov do contrato na SMC - avaliar percentual - falar com Bia",cg:"avaliar mar/26",la:"SMC",da:"2024-03-16",sit:"ativo",dd:null,td:null,od:null,nv:"N1 - Junior",tr:"Técnica",pj:null,ca:"Assessor de TI",rii:5158.5},
  {n:"Bruna Moura de Lustosa",tv:"pj",c:"Assistente de Marketing",d:"Marketing",rm:4000,b:0,obs:null,cg:null,la:"BNP",da:"2025-02-03",sit:"inativo",dd:"2025-10-18",td:"dispensado",od:null,nv:"N1 - Junior",tr:"Produto/Projeto",pj:null,ca:"Assistente de Marketing",rii:4000},
  {n:"Cintia Rossito Purcino Morgado",tv:"clt",c:"Assistente de RH/Adm",d:"RH",rm:2599.5,b:300,obs:"Sindical - Aguardar Índice para aplicação | Finaliza curso em Dez/25 (?)",cg:null,la:"BNP",da:"2024-03-04",sit:"ativo",dd:null,td:null,od:null,nv:"N1 - Junior",tr:"Gestão",pj:null,ca:"Assistente Administrativo",rii:2703.48},
  {n:"Patricia da Silva Gonçalves",tv:"socio",c:"CFO/Sócio",d:"Financeiro",rm:0,b:0,obs:null,cg:null,la:"BNP",da:"2011-07-01",sit:"ativo",dd:null,td:null,od:null,nv:"N5 - Gerência",tr:"Gestão",pj:null,ca:"CFO",rii:0},
  {n:"Fernando Bertolaccini",tv:"pj",c:"Cientista de Dados",d:"Dados",rm:0,b:0,obs:null,cg:null,la:"BNP",da:"2023-12-05",sit:"inativo",dd:"2024-12-20",td:"solicitou-dispensa",od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:null,rii:10000},
  {n:"João Leiva",tv:"pj",c:"Cientista de Dados",d:"Dados",rm:0,b:0,obs:null,cg:null,la:"BNP/SCEIC",da:"2024-08-01",sit:"inativo",dd:"2025-01-29",td:"solicitou-dispensa",od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:null,rii:15000},
  {n:"Jackson Souza Martins",tv:"socio",c:"CMO",d:"Gestão",rm:0,b:0,obs:null,cg:null,la:"BNP",da:"2015-12-14",sit:"ativo",dd:null,td:null,od:null,nv:"N5 - Gerência",tr:"Produto/Projeto",pj:null,ca:"CMO",rii:0},
  {n:"Adilson Lima",tv:"socio",c:"Consultor de Negócios",d:"Comercial",rm:0,b:0,obs:null,cg:null,la:"BNP",da:"2019-05-02",sit:"ativo",dd:null,td:null,od:null,nv:"N5 - Gerência",tr:"Produto/Projeto",pj:null,ca:"Consultor de negócios",rii:0},
  // Row 67-76
  {n:"Ana Cristina Afonso Ferreira Pereira",tv:"clt",c:"Consultor de Vendas",d:"Comercial",rm:1962.17,b:0,obs:"Recebe Auxílio Crechê",cg:"avaliar fev/26",la:"BNP",da:"2019-04-03",sit:"ativo",dd:null,td:null,od:null,nv:"N1 - Junior",tr:"Produto/Projeto",pj:null,ca:"Consultor de Vendas",rii:2040.66},
  {n:"Bianca Massuia Dezorzi",tv:"pj",c:"Coord. Equipes Desenvolvimento",d:"Desenvolvimento",rm:6537.65,b:0,obs:null,cg:null,la:"BNP",da:"2018-02-06",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Gestão",pj:null,ca:"Gerente de Sucesso",rii:7000},
  {n:"Filipe Borges",tv:"socio",c:"Coord. Equipes Desenvolvimento",d:"Desenvolvimento",rm:0,b:0,obs:null,cg:null,la:"BNP",da:"2012-09-17",sit:"ativo",dd:null,td:null,od:null,nv:"N5 - Gerência",tr:"Gestão",pj:null,ca:"Coordenador de Desenvolvimento",rii:0},
  {n:"Francisco Jose Ferreira",tv:"pj",c:"Coordenador de Projetos",d:"Projetos",rm:4000,b:0,obs:null,cg:null,la:"BNP",da:"2021-05-01",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Gestão",pj:null,ca:"Coordenador de Projetos",rii:4000},
  {n:"Fabricio Alves da Cruz",tv:"clt",c:"Coordenador de Suporte",d:"Suporte",rm:5500,b:0,obs:null,cg:null,la:"SIURB",da:"2025-03-07",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Gestão",pj:null,ca:"Coordenador de Suporte",rii:5720},
  {n:"Rodnei Moreira",tv:"clt",c:"Coordenador de Suporte",d:"Suporte",rm:6211.54,b:0,obs:null,cg:null,la:"BNP",da:"2023-05-02",sit:"inativo",dd:"2025-04-08",td:"dispensado",od:null,nv:"N2 - Pleno",tr:"Gestão",pj:null,ca:"Coordenador de Suporte",rii:6211.54},
  {n:"William Matos Ferreira",tv:"pj",c:"Coordenador de Suporte",d:"Suporte",rm:8500,b:0,obs:"BNP paga o convênio + família + convênio estacionamento Ibis R$270,00",cg:null,la:"BNP",da:"2024-08-01",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Gestão",pj:null,ca:"Coordenador de Suporte",rii:8500},
  {n:"Lucas Matos Rodrigues Silveira",tv:"clt",c:"Desenvolvedor",d:"IA",rm:1000,b:0,obs:null,cg:null,la:"BNP",da:"2025-04-01",sit:"ativo",dd:null,td:null,od:null,nv:"N1 - Junior",tr:"Técnica",pj:null,ca:"Estagiário",rii:2600},
  {n:"Letícia Desiderio",tv:"pj",c:"Desenvolvedor Back-End",d:"Desenvolvimento",rm:4000,b:0,obs:null,cg:null,la:"BNP",da:"2022-05-02",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:"Desenvolvedor Back end",rii:5000},
  {n:"Fernanda Lima Kagami",tv:"pj",c:"Desenvolvedor Front-End",d:"Desenvolvimento",rm:3500,b:0,obs:null,cg:null,la:"BNP",da:"2024-02-14",sit:"inativo",dd:"2025-06-06",td:"solicitou-dispensa",od:null,nv:"N1 - Junior",tr:"Técnica",pj:null,ca:"Desenvolvedor",rii:3500},
  // Row 77-86
  {n:"Carla Zola",tv:"pj",c:"Desenvolvedor Front-End",d:"Desenvolvimento",rm:3500,b:0,obs:null,cg:null,la:"BNP",da:"2023-08-08",sit:"ativo",dd:null,td:null,od:null,nv:"N1 - Junior",tr:"Técnica",pj:null,ca:"Analista de Desenvolvimento",rii:4400},
  {n:"Matheus Gomes Lopes da Silva",tv:"pj",c:"Desenvolvedor Front-End",d:"Desenvolvimento",rm:4000,b:0,obs:null,cg:null,la:"BNP",da:"2024-02-14",sit:"ativo",dd:null,td:null,od:null,nv:"N1 - Junior",tr:"Técnica",pj:null,ca:"Desenvolvedor",rii:5000},
  {n:"Matheus Morais Pereira",tv:"pj",c:"Desenvolvedor Front-End",d:"Desenvolvimento",rm:4000,b:0,obs:"Tem bolsa de Estudos",cg:null,la:"BNP",da:"2022-07-01",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:"Desenvolvedor Pleno",rii:5000},
  {n:"Cauê Mendonça de Sousa",tv:"clt",c:"Desenvolvedor FullStack",d:"Desenvolvimento",rm:2500,b:0,obs:null,cg:null,la:"SMC",da:"2025-05-12",sit:"ativo",dd:null,td:null,od:null,nv:"N1 - Junior",tr:"Técnica",pj:null,ca:"Desenvolvedor Junior",rii:2600},
  {n:"Henrique Gabriel de Moura",tv:"pj",c:"Desenvolvedor FullStack",d:"Desenvolvimento",rm:0,b:0,obs:null,cg:null,la:"BNP",da:"2024-07-22",sit:"inativo",dd:"2025-03-06",td:"solicitou-dispensa",od:null,nv:"N1 - Junior",tr:"Técnica",pj:null,ca:null,rii:3500},
  {n:"Matheus Sarcineli",tv:"pj",c:"Desenvolvedor FullStack",d:"Desenvolvimento",rm:3500,b:0,obs:null,cg:null,la:"SMC",da:"2024-11-04",sit:"ativo",dd:null,td:null,od:null,nv:"N1 - Junior",tr:"Técnica",pj:null,ca:"Desenvolvedor Junior",rii:4000},
  {n:"Walison Araujo Santana",tv:"pj",c:"Desenvolvedor FullStack",d:"Desenvolvimento",rm:4500,b:0,obs:null,cg:null,la:"SMC",da:"2024-10-09",sit:"ativo",dd:null,td:null,od:null,nv:"N1 - Junior",tr:"Técnica",pj:null,ca:"Desenvolvedor Junior",rii:4626.9},
  {n:"Cristhian Felipe da Silva",tv:"pj",c:"Desenvolvedor FullStack",d:"Desenvolvimento",rm:4500,b:0,obs:"Em jun26 + R$750 (promover para nível pleno)",cg:"avaliar abr/26",la:"BNP",da:"2024-06-03",sit:"ativo",dd:null,td:null,od:null,nv:"N1 - Junior",tr:"Técnica",pj:null,ca:"Desenvolvedor Junior",rii:5250},
  {n:"Samara Caldas",tv:"clt",c:"Desenvolvedor FullStack",d:"Desenvolvimento",rm:2599.75,b:300,obs:"Sindical - Aguardar Índice para aplicação",cg:null,la:"BNP",da:"2024-06-20",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:"Desenvolvedor Junior",rii:2928.35},
  {n:"Alef Cauê White da Silva",tv:"clt",c:"Desenvolvedor FullStack",d:"Desenvolvimento",rm:3000,b:0,obs:null,cg:null,la:"BNP",da:"2025-05-05",sit:"inativo",dd:"2025-06-18",td:"dispensado",od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:"Desenvolvedor Fullk-Stack Pleno",rii:3000},
  // Row 87-96
  {n:"João Pedro Farias Costa",tv:"pj",c:"Desenvolvedor FullStack",d:"Desenvolvimento",rm:4400,b:0,obs:null,cg:null,la:"SMC",da:"2023-08-29",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:"Desenvolvedor Pleno",rii:4539.48},
  {n:"Natália Zanella",tv:"pj",c:"Desenvolvedor FullStack",d:"Desenvolvimento",rm:3700,b:0,obs:null,cg:null,la:"SMC",da:"2023-08-29",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:"Desenvolvedor Junior",rii:4539.48},
  {n:"Bruna Ruri Kobayachi",tv:"pj",c:"Desenvolvedor FullStack",d:"Desenvolvimento",rm:3500,b:0,obs:null,cg:null,la:"BNP",da:"2023-08-08",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:"Desenvolvedor Front-End",rii:5000},
  {n:"Fabricio Oliveira",tv:"pj",c:"Desenvolvedor FullStack",d:"Desenvolvimento",rm:5000,b:0,obs:null,cg:null,la:"BNP",da:"2024-04-16",sit:"inativo",dd:"2025-08-08",td:"dispensado",od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:"Desenvolvedor",rii:5000},
  {n:"Patrick Martins",tv:"pj",c:"Desenvolvedor FullStack",d:"Desenvolvimento",rm:4000,b:0,obs:null,cg:null,la:"BNP",da:"2024-11-04",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:"Full stack pleno",rii:5000},
  {n:"André Ofuji",tv:"pj",c:"Desenvolvedor FullStack",d:"Desenvolvimento",rm:0,b:0,obs:null,cg:null,la:"BNP",da:"2025-06-11",sit:"inativo",dd:"2025-10-26",td:"solicitou-dispensa",od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:"Desenvolvedor",rii:6000},
  {n:"Arian Carvalho",tv:"pj",c:"Desenvolvedor FullStack",d:"Desenvolvimento",rm:6000,b:0,obs:null,cg:null,la:"BNP",da:"2025-04-24",sit:"inativo",dd:"2025-10-10",td:"dispensado",od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:"Desenvolvedor Fullk-Stack Pleno",rii:6000},
  {n:"Beatriz Aquino",tv:"pj",c:"Desenvolvedor FullStack",d:"Desenvolvimento",rm:0,b:0,obs:null,cg:null,la:"BNP",da:"2025-10-13",sit:"inativo",dd:"2025-11-28",td:"dispensado",od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:null,rii:6000},
  {n:"Cezar Fernando Barbosa Cangussu",tv:"pj",c:"Desenvolvedor FullStack",d:"Desenvolvimento",rm:0,b:0,obs:null,cg:null,la:"BNP",da:"2025-07-16",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:null,rii:6000},
  {n:"Eduardo Carneiro",tv:"pj",c:"Desenvolvedor FullStack",d:"Desenvolvimento",rm:6000,b:0,obs:null,cg:null,la:"BNP",da:"2025-04-24",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:"Desenvolvedor Fullk-Stack Pleno",rii:6000},
  // Row 97-106
  {n:"Giovanny Gabriel",tv:"pj",c:"Desenvolvedor FullStack",d:"Desenvolvimento",rm:0,b:0,obs:null,cg:null,la:"BNP",da:"2025-07-03",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:"Desenvolvedor",rii:6000},
  {n:"Herick da Silva Moreira",tv:"pj",c:"Desenvolvedor FullStack",d:"Desenvolvimento",rm:0,b:0,obs:null,cg:null,la:"BNP",da:"2025-11-17",sit:"inativo",dd:"2026-01-09",td:"solicitou-dispensa",od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:null,rii:6000},
  {n:"João Eduardo Braga",tv:"pj",c:"Desenvolvedor FullStack",d:"Desenvolvimento",rm:0,b:0,obs:null,cg:null,la:"BNP",da:"2025-08-01",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:null,rii:6000},
  {n:"Jonas de Oliveria Gomes",tv:"pj",c:"Desenvolvedor FullStack",d:"Desenvolvimento",rm:0,b:0,obs:null,cg:null,la:"BNP",da:"2025-07-11",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:null,rii:6000},
  {n:"Leandro Henrique Siqueira",tv:"pj",c:"Desenvolvedor FullStack",d:"Desenvolvimento",rm:5000,b:0,obs:null,cg:null,la:"BNP",da:"2023-08-08",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:"Desenvolvedor",rii:6000},
  {n:"Murilo Rodrigues da Silva",tv:"pj",c:"Desenvolvedor FullStack",d:"Desenvolvimento",rm:6000,b:0,obs:null,cg:null,la:"BNP",da:"2025-04-24",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:"Desenvolvedor Fullk-Stack Pleno",rii:6000},
  {n:"Samuel Dantas Cavalcante Evangelista",tv:"pj",c:"Desenvolvedor FullStack",d:"Desenvolvimento",rm:0,b:0,obs:null,cg:null,la:"BNP",da:"2025-07-11",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:null,rii:6000},
  {n:"Wesley Patrick Ochakowski",tv:"pj",c:"Desenvolvedor FullStack",d:"Desenvolvimento",rm:0,b:0,obs:null,cg:null,la:"BNP",da:"2026-02-02",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:null,rii:6000},
  {n:"Ariel Pimenta Leite",tv:"pj",c:"Desenvolvedor FullStack",d:"Desenvolvimento",rm:6000,b:0,obs:null,cg:null,la:"SMC",da:"2023-08-29",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:"Desenvolvedor Pleno",rii:6350},
  {n:"Rafael Constantino",tv:"pj",c:"Desenvolvedor FullStack",d:"Desenvolvimento",rm:0,b:0,obs:null,cg:null,la:"BNP",da:"2024-11-04",sit:"inativo",dd:"2025-03-31",td:"dispensado",od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:null,rii:7000},
  // Row 107-116
  {n:"Matheus Louly",tv:"pj",c:"Desenvolvedor FullStack",d:"Desenvolvimento",rm:7000,b:0,obs:null,cg:null,la:"BNP",da:"2024-02-14",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:"Desenvolvedor Full stack",rii:7500},
  {n:"Daniel Lisboa",tv:"pj",c:"Desenvolvedor FullStack",d:"Desenvolvimento",rm:0,b:0,obs:null,cg:null,la:"BNP",da:"2024-11-14",sit:"inativo",dd:"2025-03-31",td:"dispensado",od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:null,rii:9000},
  {n:"Maycon Douglas",tv:"pj",c:"Desenvolvedor FullStack",d:"Desenvolvimento",rm:0,b:0,obs:null,cg:null,la:"BNP",da:"2024-11-04",sit:"inativo",dd:null,td:"dispensado",od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:null,rii:11000},
  {n:"Giovanna Avila",tv:"clt",c:"Designer Gráfico",d:"Desenvolvimento",rm:2500,b:0,obs:null,cg:null,la:"BNP",da:"2025-01-08",sit:"ativo",dd:null,td:null,od:null,nv:"N1 - Junior",tr:"Produto/Projeto",pj:null,ca:"Designer Gráfico",rii:2600},
  {n:"Isabella Gaspar Tereso",tv:"pj",c:"Designer Gráfico",d:"Marketing",rm:0,b:0,obs:null,cg:null,la:"BNP",da:"2025-07-01",sit:"inativo",dd:"2026-01-31",td:null,od:"Transferência para Realme",nv:"N1 - Junior",tr:"Produto/Projeto",pj:null,ca:"-",rii:4500},
  {n:"Renan Barbosa",tv:"clt",c:"Designer Gráfico",d:"Desenvolvimento",rm:3666.95,b:300,obs:"Sindical - Aguardar Índice para aplicação",cg:"avaliar fev/26 - Função",la:"BNP",da:"2023-12-04",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Produto/Projeto",pj:null,ca:"Designer Gráfico",rii:3813.63},
  {n:"Carlos Eduardo Ribeiro Mathias",tv:"pj",c:"Designer UX/UI",d:"Desenvolvimento",rm:8000,b:0,obs:"Dispensar - 1a semana fev/26",cg:null,la:"BNP/Via Luz",da:"2024-07-04",sit:"inativo",dd:"2026-02-28",td:"dispensado",od:null,nv:"N2 - Pleno",tr:"Produto/Projeto",pj:null,ca:"Designer UX/UI",rii:8000},
  {n:"Roberto Pereira Gonçalves",tv:"socio",c:"Diretor Geral",d:"Comercial",rm:0,b:0,obs:null,cg:null,la:"BNP",da:"2008-09-22",sit:"ativo",dd:null,td:null,od:null,nv:"N5 - Gerência",tr:"Gestão",pj:null,ca:"Diretor Geral",rii:0},
  {n:"Sabrina Alvarez",tv:"pj",c:"Editora de Áudivisual",d:"Marketing",rm:3000,b:0,obs:null,cg:null,la:"REALME",da:"2024-09-16",sit:"inativo",dd:"2025-05-31",td:"dispensado",od:null,nv:"N1 - Junior",tr:"Produto/Projeto",pj:null,ca:"Designer Gráfico",rii:3000},
  {n:"Nelson da Silva Jaime",tv:"pj",c:"Engenheiro de Dados",d:"Dados",rm:13000,b:0,obs:null,cg:null,la:"BNP",da:"2024-12-09",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:"Analista de Dados",rii:13553.8},
  // Row 117-126
  {n:"José Icaro Bezzera Clemente",tv:"cooperado",c:"Especialista em IA e ML",d:"IA",rm:20000,b:0,obs:null,cg:null,la:"BNP/Via Luz",da:"2024-03-19",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:"Consultor de IA e Machine Learning",rii:10000},
  {n:"Giovanna Victória da Silva Pereira",tv:"estagio",c:"Estagiário",d:"Suporte",rm:0,b:0,obs:null,cg:null,la:"BNP",da:"2025-10-13",sit:"ativo",dd:null,td:null,od:null,nv:"-",tr:"Técnica",pj:null,ca:null,rii:1000},
  {n:"Luigi Matheus Gomes",tv:"estagio",c:"Estagiário",d:"Dados",rm:0,b:0,obs:null,cg:null,la:"BNP",da:"2025-10-03",sit:"ativo",dd:null,td:null,od:null,nv:"-",tr:"Técnica",pj:null,ca:null,rii:1000},
  {n:"Renan Oliveira Santa Rosa",tv:"estagio",c:"Estagiário",d:"Desenvolvimento",rm:1000,b:0,obs:null,cg:null,la:"BNP",da:"2025-03-05",sit:"inativo",dd:"2025-06-02",td:"dispensado",od:null,nv:"-",tr:"Técnica",pj:null,ca:"Estagiário",rii:1000},
  {n:"Thiago Crespo Pitas",tv:"estagio",c:"Estagiário",d:"Desenvolvimento",rm:1000,b:0,obs:null,cg:null,la:"BNP",da:"2024-07-01",sit:"inativo",dd:"2025-04-23",td:"dispensado",od:null,nv:"-",tr:"Técnica",pj:null,ca:"Estagiário",rii:1000},
  {n:"Gustavo Lopes de Oliveira",tv:"pj",c:"Gerente de Contas",d:"Comercial",rm:7500,b:0,obs:null,cg:null,la:"BNP",da:"2023-07-03",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Produto/Projeto",pj:null,ca:"Gerente de Contas",rii:7500},
  {n:"Victoria Lorena Máximo Benati",tv:"pj",c:"Gerente de Criação",d:"Marketing",rm:0,b:0,obs:null,cg:null,la:"BNP",da:"2025-08-18",sit:"inativo",dd:"2025-01-31",td:null,od:"Transferência para Realme",nv:"N2 - Pleno",tr:"Produto/Projeto",pj:null,ca:null,rii:4000},
  {n:"Maria Izabel Filocri Martins Torres",tv:"pj",c:"Gerente de Marketing",d:"Marketing",rm:7500,b:0,obs:null,cg:null,la:"REALME",da:"2023-05-08",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Produto/Projeto",pj:null,ca:"Head de Marketing",rii:7500},
  {n:"Dirceu Mattos",tv:"pj",c:"Gerente de Projetos",d:"Projetos",rm:0,b:0,obs:null,cg:null,la:"BNP",da:"2021-10-26",sit:"ativo",dd:null,td:null,od:null,nv:"N5 - Gerência",tr:"Gestão",pj:null,ca:"Gerente de Projetos",rii:21000},
  {n:"Allan Nemes Silva Moreira",tv:"socio",c:"Gerente SRE",d:"Infraestrutura",rm:0,b:0,obs:null,cg:null,la:"BNP",da:"2014-10-10",sit:"ativo",dd:null,td:null,od:null,nv:"N5 - Gerência",tr:"Gestão",pj:null,ca:"Tech Manager",rii:0},
  // Row 127-134
  {n:"Alexandre das Dores Nunes",tv:"clt",c:"Infraestrutura e Cabeamento",d:"Suporte",rm:3227.02,b:0,obs:null,cg:null,la:"SIURB",da:"2023-05-02",sit:"ativo",dd:null,td:null,od:null,nv:"N1 - Junior",tr:"Técnica",pj:null,ca:"Infraestrutura e Cabeamento",rii:3356.1},
  {n:"Danilo Shiguenori Uema",tv:"socio",c:"Lider de Desenvolvimento",d:"Desenvolvimento",rm:0,b:0,obs:null,cg:null,la:"BNP",da:"2012-06-01",sit:"ativo",dd:null,td:null,od:null,nv:"N5 - Gerência",tr:"Gestão",pj:null,ca:"Lead Developer",rii:0},
  {n:"Ana Carollina Correa",tv:"clt",c:"Product Owner",d:"Desenvolvimento",rm:4200,b:1000,obs:"Motivo - Performance",cg:"Avaliar fev/26",la:"BNP",da:"2024-04-19",sit:"ativo",dd:null,td:null,od:null,nv:"N1 - Junior",tr:"Produto/Projeto",pj:null,ca:"Analista de Implantação",rii:4368},
  {n:"Roberta Silva",tv:"clt",c:"Product Owner",d:"Desenvolvimento",rm:0,b:1000,obs:"Dispensar - verificar com Erick - avaliar data 1a quinzena fev/26",cg:null,la:"BNP",da:"2025-09-01",sit:"ativo",dd:null,td:null,od:null,nv:"N1 - Junior",tr:"Produto/Projeto",pj:null,ca:null,rii:4368},
  {n:"Erick Sandes de Oliveira",tv:"pj",c:"Product Owner",d:"Desenvolvimento",rm:0,b:0,obs:"Equiparar ao Thiago ???",cg:"Avaliar mar/26",la:"BNP",da:"2025-12-20",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Produto/Projeto",pj:null,ca:null,rii:7500},
  {n:"Jessica Castro Freire",tv:"clt",c:"Product Owner",d:"Desenvolvimento",rm:8095.2,b:0,obs:null,cg:null,la:"BNP",da:"2024-10-07",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Produto/Projeto",pj:null,ca:"Product Owner",rii:8419.01},
  {n:"Thiago Borgueti",tv:"pj",c:"Product Owner",d:"Desenvolvimento",rm:0,b:0,obs:null,cg:null,la:"BNP",da:"2025-10-04",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Produto/Projeto",pj:null,ca:null,rii:8500},
  {n:"Karine Tedesco Faleiro",tv:"pj",c:"Product Owner",d:"Desenvolvimento",rm:11845.9,b:0,obs:null,cg:null,la:"BNP",da:"2022-06-12",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Produto/Projeto",pj:null,ca:"Product Owner",rii:11845.9},
  // Row 135-140
  {n:"Alexandre Hideki Siroma",tv:"cooperado",c:"Tech lead",d:"Desenvolvimento",rm:9150,b:0,obs:"Tem Bolsa de Estudos",cg:null,la:"BNP",da:"2024-09-01",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:"Tech lead",rii:9150},
  {n:"Dário Domingues",tv:"pj",c:"Tech lead",d:"Desenvolvimento",rm:9000,b:0,obs:null,cg:null,la:"BNP/Via Luz",da:"2023-01-12",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:"Desenvolvedor Full stack senior",rii:10500},
  {n:"Luciano Arantes Monçao",tv:"cooperado",c:"Tech lead",d:"Desenvolvimento",rm:11000,b:2000,obs:null,cg:null,la:"BNP",da:"2023-03-20",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:"Tech lead",rii:11000},
  {n:"Mateus Santos Ferreira",tv:"cooperado",c:"Tech lead",d:"Desenvolvimento",rm:8300,b:0,obs:"Ex-CLT",cg:null,la:"BNP/Via Luz",da:"2024-10-24",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:"Tech lead",rii:11000},
  {n:"Jonathas Aparecido de Oliveira",tv:"cooperado",c:"Tech lead",d:"Desenvolvimento",rm:13500,b:0,obs:null,cg:null,la:"BNP",da:"2021-02-15",sit:"ativo",dd:null,td:null,od:null,nv:"N2 - Pleno",tr:"Técnica",pj:null,ca:"Tech lead",rii:14200},
  {n:"Daniel Junior",tv:"cooperado",c:"Tech lead",d:"Desenvolvimento",rm:15000,b:0,obs:null,cg:null,la:"BNP",da:"2024-01-23",sit:"ativo",dd:null,td:null,od:null,nv:"N3 - Senior",tr:"Técnica",pj:null,ca:"Full stack senior developer",rii:15500},
];

// Timeline events from Page 2
const timeline: TimelineData[] = [
  {name:"Jhonathan Costa Chaves",date:"2021-06-01",valor:"2200",desc:null},
  {name:"Jhonathan Costa Chaves",date:"2021-10-01",valor:"2500",desc:null},
  {name:"Jhonathan Costa Chaves",date:"2022-01-01",valor:"2648.75",desc:null},
  {name:"Jhonathan Costa Chaves",date:"2022-06-01",valor:"2913.63",desc:null},
  {name:"Jhonathan Costa Chaves",date:"2022-08-01",valor:"3204.99",desc:null},
  {name:"Jhonathan Costa Chaves",date:"2023-01-01",valor:"3395.04",desc:null},
  {name:"Jhonathan Costa Chaves",date:"2023-07-01",valor:"3734.54",desc:null},
  {name:"Jhonathan Costa Chaves",date:"2023-08-01",valor:"5000",desc:null},
  {name:"Jhonathan Costa Chaves",date:"2023-11-01",valor:"5200",desc:null},
  {name:"Jhonathan Costa Chaves",date:"2024-02-01",valor:"5408",desc:null},
  {name:"Jhonathan Costa Chaves",date:"2024-07-01",valor:"5608",desc:null},
  {name:"Jhonathan Costa Chaves",date:"2025-01-01",valor:"5875.5",desc:null},
  {name:"Vitor Prado",date:"2024-01-08",valor:"4237.2",desc:null},
  {name:"Vitor Prado",date:"2024-05-01",valor:"4437.2",desc:null},
  {name:"Vitor Prado",date:"2024-07-01",valor:"4637.2",desc:null},
  {name:"Vitor Prado",date:"2024-09-01",valor:"5900",desc:null},
  {name:"Vitor Prado",date:"2024-12-01",valor:"6100",desc:null},
  {name:"Vitor Prado",date:"2025-01-01",valor:"6390.97",desc:null},
  {name:"Vitor Prado",date:"2025-03-01",valor:"6690.97",desc:null},
  {name:"Vitor Prado",date:"2025-04-01",valor:"6890.97",desc:null},
  {name:"Mário Andrade da Silva",date:"2021-04-05",valor:"7000",desc:null},
  {name:"Mário Andrade da Silva",date:"2024-02-01",valor:"7900",desc:null},
  {name:"Mário Andrade da Silva",date:"2025-03-01",valor:"8126.73",desc:null},
  {name:"Mário Andrade da Silva",date:"2025-03-01",valor:"8524.13",desc:null},
  {name:"Katia Cristina Salemme da Silva",date:"2015-02-02",valor:"1801.37",desc:null},
  {name:"Katia Cristina Salemme da Silva",date:"2021-03-01",valor:"2071.58",desc:null},
  {name:"Katia Cristina Salemme da Silva",date:"2022-01-01",valor:"2282.05",desc:null},
  {name:"Katia Cristina Salemme da Silva",date:"2022-02-01",valor:"2624.36",desc:null},
  {name:"Katia Cristina Salemme da Silva",date:"2022-08-01",valor:"2900",desc:null},
  {name:"Katia Cristina Salemme da Silva",date:"2023-01-01",valor:"3190",desc:null},
  {name:"Katia Cristina Salemme da Silva",date:"2024-02-01",valor:"4000",desc:null},
  {name:"Katia Cristina Salemme da Silva",date:"2024-02-02",valor:"4160",desc:null},
  {name:"Katia Cristina Salemme da Silva",date:"2025-01-01",valor:"4358.43",desc:null},
  {name:"Katia Cristina Salemme da Silva",date:"2026-01-01",valor:"4532.77",desc:null},
  {name:"Janaina Rodrigues Valim",date:"2022-02-01",valor:"1700",desc:null},
  {name:"Janaina Rodrigues Valim",date:"2022-08-01",valor:"2000",desc:null},
  {name:"Janaina Rodrigues Valim",date:"2023-01-01",valor:"2118.6",desc:null},
  {name:"Janaina Rodrigues Valim",date:"2023-10-01",valor:"3000",desc:null},
  {name:"Janaina Rodrigues Valim",date:"2024-02-01",valor:"3120",desc:null},
  {name:"Janaina Rodrigues Valim",date:"2024-07-01",valor:"3320",desc:null},
  {name:"Janaina Rodrigues Valim",date:"2025-01-01",valor:"3478.36",desc:null},
  {name:"Janaina Rodrigues Valim",date:"2025-07-01",valor:"VA +R$500,00",desc:null},
  {name:"Janaina Rodrigues Valim",date:"2026-01-01",valor:"3617.49",desc:null},
  {name:"Leticia Oliveira Vieira",date:"2026-02-01",valor:"7298.2",desc:null},
  {name:"Fabio Zanin Domingues",date:"2024-03-04",valor:"2300",desc:null},
  {name:"Fabio Zanin Domingues",date:"2024-10-01",valor:"2585.02",desc:null},
  {name:"Fabio Zanin Domingues",date:"2025-01-01",valor:"2687.9",desc:null},
  {name:"Fabio Zanin Domingues",date:"2025-04-01",valor:"3200",desc:null},
  {name:"Fabio Zanin Domingues",date:"2025-07-01",valor:"VA +R$500,00",desc:null},
  {name:"Fabio Zanin Domingues",date:"2025-07-01",valor:"Transferido Área Dados e função Analista Dados Jr",desc:null},
  {name:"Fabio Zanin Domingues",date:"2026-01-01",valor:"3328",desc:null},
  {name:"Fabio Zanin Domingues",date:"2026-01-01",valor:"3328",desc:null},
  {name:"Moisés Martinez Rodrigues",date:"2023-02-17",valor:"1846.04",desc:null},
  {name:"Moisés Martinez Rodrigues",date:"2024-02-01",valor:"2600",desc:null},
  {name:"Moisés Martinez Rodrigues",date:"2024-02-02",valor:"2686.58",desc:null},
  {name:"Moisés Martinez Rodrigues",date:"2025-01-01",valor:"2814.73",desc:null},
  {name:"Moisés Martinez Rodrigues",date:"2025-04-01",valor:"3014.73",desc:null},
  {name:"Moisés Martinez Rodrigues",date:"2025-06-01",valor:"VA +R$300,00",desc:null},
  {name:"Moisés Martinez Rodrigues",date:"2025-06-01",valor:"Função - Analista de Suporte",desc:null},
  {name:"Moisés Martinez Rodrigues",date:"2026-02-01",valor:"Função - Analista de Infraestrutura",desc:null},
  {name:"Moisés Martinez Rodrigues",date:"2026-02-01",valor:"3316.2",desc:null},
  {name:"Anderson Lopes de Oliveira",date:"2023-07-17",valor:"3600",desc:null},
  {name:"Anderson Lopes de Oliveira",date:"2024-01-01",valor:"3660.12",desc:null},
  {name:"Anderson Lopes de Oliveira",date:"2025-01-01",valor:"3834.71",desc:null},
  {name:"Anderson Lopes de Oliveira",date:"2026-02-01",valor:"VA +R$300,00",desc:null},
  {name:"Anderson Lopes de Oliveira",date:"2026-02-01",valor:"Função - Analista de Infraestrutura",desc:null},
  {name:"Anderson Lopes de Oliveira",date:"2026-02-01",valor:"4026.45",desc:null},
  {name:"Juliana Serette",date:"2025-10-01",valor:"7000",desc:null},
  {name:"Bruno Benetti",date:"2024-07-29",valor:"2300",desc:null},
  {name:"Bruno Benetti",date:"2025-01-01",valor:"2345.77",desc:null},
  {name:"Bruno Benetti",date:"2025-03-01",valor:"2545.77",desc:null},
  {name:"Bruno Benetti",date:"2025-07-01",valor:"VA +R$300,00",desc:null},
  {name:"Bruno Benetti",date:"2025-11-01",valor:"Alteração de função para Analista SER",desc:null},
  {name:"Bruno Benetti",date:"2026-01-01",valor:"2647.6",desc:null},
  {name:"Diogo Veiga Islanio",date:"2023-09-01",valor:"2100",desc:null},
  {name:"Diogo Veiga Islanio",date:"2024-09-01",valor:"2184",desc:null},
  {name:"Diogo Veiga Islanio",date:"2025-09-01",valor:"2295.38",desc:null},
  {name:"Eduardo Alves da Silva",date:"2026-01-01",valor:"2585",desc:null},
  {name:"Eduardo Alves da Silva",date:"2026-01-01",valor:"2688.4",desc:null},
  {name:"Karina Cecilia de Campos Fanti",date:"2026-01-01",valor:"2688.4",desc:null},
  {name:"Victor Costa Bergamin",date:"2026-01-01",valor:"2688.4",desc:null},
  {name:"Enzo Felipe Martins Cranchi",date:"2024-12-06",valor:"2585.02",desc:null},
  {name:"Enzo Felipe Martins Cranchi",date:"2025-01-20",valor:"2595.36",desc:null},
  {name:"Enzo Felipe Martins Cranchi",date:"2026-01-01",valor:"2699.17",desc:null},
  {name:"Gabriel Hertel da Silva",date:"2024-10-17",valor:"2585.02",desc:null},
  {name:"Gabriel Hertel da Silva",date:"2025-01-20",valor:"2605.7",desc:null},
  {name:"Gabriel Hertel da Silva",date:"2026-01-01",valor:"2709.93",desc:null},
  {name:"Gustavo de Oliveira Souza Ramos",date:"2024-10-08",valor:"2585.02",desc:null},
  {name:"Gustavo de Oliveira Souza Ramos",date:"2025-01-20",valor:"2615.78",desc:null},
  {name:"Gustavo de Oliveira Souza Ramos",date:"2025-07-01",valor:"VA +R$300,00",desc:null},
  {name:"Gustavo de Oliveira Souza Ramos",date:"2026-01-01",valor:"2720.41",desc:null},
  {name:"Michelle Pedroso Rodrigues",date:"2024-10-14",valor:"2585.02",desc:null},
  {name:"Michelle Pedroso Rodrigues",date:"2025-01-20",valor:"2615.78",desc:null},
  {name:"Michelle Pedroso Rodrigues",date:"2025-07-01",valor:"VA +R$300,00",desc:null},
  {name:"Michelle Pedroso Rodrigues",date:"2025-10-01",valor:"VA + R$200,00",desc:null},
  {name:"Michelle Pedroso Rodrigues",date:"2026-01-01",valor:"2720.41",desc:null},
  {name:"Wesley Sabino Siqueira da Silva",date:"2024-06-10",valor:"2600",desc:null},
  {name:"Wesley Sabino Siqueira da Silva",date:"2025-01-01",valor:"2672.28",desc:null},
  {name:"Wesley Sabino Siqueira da Silva",date:"2026-01-01",valor:"2779.17",desc:null},
  {name:"Vitor de Mello Pena",date:"2024-07-16",valor:"2900",desc:null},
  {name:"Vitor de Mello Pena",date:"2025-01-01",valor:"2969.31",desc:null},
  {name:"Vitor de Mello Pena",date:"2026-01-01",valor:"3088.08",desc:null},
  {name:"Guilherme Pereira Grangeiro",date:"2024-01-08",valor:"2600",desc:null},
  {name:"Guilherme Pereira Grangeiro",date:"2024-10-01",valor:"2860",desc:null},
  {name:"Guilherme Pereira Grangeiro",date:"2025-01-01",valor:"2996.42",desc:null},
  {name:"Guilherme Pereira Grangeiro",date:"2026-01-01",valor:"3116.28",desc:null},
  {name:"Emiliano Gil Santos de Brito",date:"2023-01-05",valor:"2500",desc:null},
  {name:"Emiliano Gil Santos de Brito",date:"2023-03-01",valor:"2800",desc:null},
  {name:"Emiliano Gil Santos de Brito",date:"2024-02-01",valor:"2912",desc:null},
  {name:"Emiliano Gil Santos de Brito",date:"2025-01-01",valor:"3050.9",desc:null},
  {name:"Emiliano Gil Santos de Brito",date:"2026-01-01",valor:"3172.94",desc:null},
  {name:"Tadeu Pinheiro Bolognes",date:"2021-12-06",valor:"2000",desc:null},
  {name:"Tadeu Pinheiro Bolognes",date:"2022-01-01",valor:"2017",desc:null},
  {name:"Tadeu Pinheiro Bolognes",date:"2022-08-01",valor:"2500",desc:null},
  {name:"Tadeu Pinheiro Bolognes",date:"2023-01-01",valor:"2648.25",desc:null},
  {name:"Tadeu Pinheiro Bolognes",date:"2024-02-01",valor:"2912",desc:null},
  {name:"Tadeu Pinheiro Bolognes",date:"2024-02-02",valor:"3028.48",desc:null},
  {name:"Tadeu Pinheiro Bolognes",date:"2025-01-01",valor:"3172.94",desc:null},
  {name:"Tadeu Pinheiro Bolognes",date:"2026-01-01",valor:"3299.86",desc:null},
  {name:"Juan Canuto Ramos Machado",date:"2024-11-14",valor:"2585.02",desc:null},
  {name:"Juan Canuto Ramos Machado",date:"2025-01-01",valor:"2605.7",desc:null},
  {name:"Juan Canuto Ramos Machado",date:"2025-02-01",valor:"3227.02",desc:null},
  {name:"Juan Canuto Ramos Machado",date:"2026-01-01",valor:"3356.1",desc:null},
  {name:"Evanilson Carvalho Sousa",date:"2021-04-05",valor:"3800",desc:null},
  {name:"Evanilson Carvalho Sousa",date:"2024-02-01",valor:"4400",desc:null},
  {name:"Evanilson Carvalho Sousa",date:"2025-03-01",valor:"4526.28",desc:null},
  {name:"Evanilson Carvalho Sousa",date:"2025-03-01",valor:"4747.61",desc:null},
  {name:"Diego dos Santos Esmerino",date:"2022-10-11",valor:"2800",desc:null},
  {name:"Diego dos Santos Esmerino",date:"2024-02-01",valor:"2912",desc:null},
  {name:"Diego dos Santos Esmerino",date:"2025-01-01",valor:"3050.9",desc:null},
  {name:"Diego dos Santos Esmerino",date:"2025-10-01",valor:"VA + R$200,00",desc:null},
  {name:"Diego dos Santos Esmerino",date:"2026-01-01",valor:"3172.94",desc:null},
  {name:"Everson dos Santos Esmerino",date:"2023-05-02",valor:"3000",desc:null},
  {name:"Everson dos Santos Esmerino",date:"2024-01-01",valor:"3080.1",desc:null},
  {name:"Everson dos Santos Esmerino",date:"2025-01-01",valor:"3227.02",desc:null},
  {name:"Everson dos Santos Esmerino",date:"2026-01-01",valor:"3356.1",desc:null},
  {name:"Rafael Paulino",date:"2025-07-07",valor:"4000",desc:null},
  {name:"Rafael Paulino",date:"2026-01-01",valor:"4160",desc:null},
  {name:"Kaique Alberto",date:"2023-07-17",valor:"4500",desc:null},
  {name:"Kaique Alberto",date:"2024-08-01",valor:"4680",desc:null},
  {name:"Kaique Alberto",date:"2025-08-01",valor:"4924.76",desc:null},
  {name:"Wellington Junior",date:"2021-04-05",valor:"4500",desc:null},
  {name:"Wellington Junior",date:"2024-02-01",valor:"5175",desc:null},
  {name:"Wellington Junior",date:"2025-03-01",valor:"5323.52",desc:null},
  {name:"Wellington Junior",date:"2025-03-01",valor:"5583.84",desc:null},
  {name:"Edwilson de Souza Novais",date:"2022-07-04",valor:"5500",desc:null},
  {name:"Edwilson de Souza Novais",date:"2024-02-01",valor:"7500",desc:null},
  {name:"Edwilson de Souza Novais",date:"2025-10-01",valor:"7911",desc:null},
  {name:"Pablo Rainho Figoli",date:"2023-09-01",valor:"5000",desc:null},
  {name:"Pablo Rainho Figoli",date:"2024-09-01",valor:"5200",desc:null},
  {name:"Pablo Rainho Figoli",date:"2025-09-01",valor:"5465.2",desc:null},
  {name:"Fernanda Matuda Baccarini",date:"2021-11-04",valor:"1600",desc:null},
  {name:"Fernanda Matuda Baccarini",date:"2022-01-01",valor:"1627.2",desc:null},
  {name:"Fernanda Matuda Baccarini",date:"2022-08-01",valor:"2000",desc:null},
  {name:"Fernanda Matuda Baccarini",date:"2023-01-01",valor:"2400",desc:null},
  {name:"Fernanda Matuda Baccarini",date:"2023-08-01",valor:"3000",desc:null},
  {name:"Fernanda Matuda Baccarini",date:"2024-02-01",valor:"3300",desc:null},
  {name:"Fernanda Matuda Baccarini",date:"2024-02-02",valor:"3432",desc:null},
  {name:"Fernanda Matuda Baccarini",date:"2024-07-01",valor:"4000",desc:null},
  {name:"Fernanda Matuda Baccarini",date:"2025-01-01",valor:"4190.8",desc:null},
  {name:"Fernanda Matuda Baccarini",date:"2025-06-01",valor:"VA +R$500,00",desc:null},
  {name:"Fernanda Matuda Baccarini",date:"2026-01-01",valor:"4358.43",desc:null},
  {name:"Andrezza Albuquerque Carvalho Domingues",date:"2024-07-01",valor:"2500",desc:null},
  {name:"Andrezza Albuquerque Carvalho Domingues",date:"2025-01-01",valor:"2559.75",desc:null},
  {name:"Andrezza Albuquerque Carvalho Domingues",date:"2025-06-01",valor:"3120",desc:null},
  {name:"Andrezza Albuquerque Carvalho Domingues",date:"2025-06-01",valor:"VA +R$500,00",desc:null},
  {name:"Andrezza Albuquerque Carvalho Domingues",date:"2026-01-01",valor:"3244.8",desc:null},
  {name:"James Marçal",date:"2025-10-01",valor:"6625.71",desc:null},
  {name:"Vinicius dos Santos Rocha da Silva",date:"2025-07-01",valor:"5000",desc:null},
  {name:"Vinicius dos Santos Rocha da Silva",date:"2025-07-01",valor:"5158.5",desc:null},
  {name:"Cintia Rossito Purcino Morgado",date:"2024-03-04",valor:"2500",desc:null},
  {name:"Cintia Rossito Purcino Morgado",date:"2025-01-01",valor:"2599.5",desc:null},
  {name:"Cintia Rossito Purcino Morgado",date:"2026-02-01",valor:"VA +R$300,00",desc:null},
  {name:"Cintia Rossito Purcino Morgado",date:"2026-01-01",valor:"2703.48",desc:null},
  {name:"Ana Cristina Afonso Ferreira Pereira",date:"2019-04-03",valor:"1200",desc:null},
  {name:"Ana Cristina Afonso Ferreira Pereira",date:"2019-09-01",valor:"1241.16",desc:null},
  {name:"Ana Cristina Afonso Ferreira Pereira",date:"2021-11-01",valor:"1296.76",desc:null},
  {name:"Ana Cristina Afonso Ferreira Pereira",date:"2022-01-01",valor:"1428.51",desc:null},
  {name:"Ana Cristina Afonso Ferreira Pereira",date:"2022-08-01",valor:"1700",desc:null},
  {name:"Ana Cristina Afonso Ferreira Pereira",date:"2023-01-01",valor:"1800.81",desc:null},
  {name:"Ana Cristina Afonso Ferreira Pereira",date:"2024-02-01",valor:"1872.84",desc:null},
  {name:"Ana Cristina Afonso Ferreira Pereira",date:"2025-01-01",valor:"1962.17",desc:null},
  {name:"Ana Cristina Afonso Ferreira Pereira",date:"2026-01-01",valor:"2040.66",desc:null},
  {name:"Bianca Massuia Dezorzi",date:"2018-02-06",valor:"1200",desc:null},
  {name:"Bianca Massuia Dezorzi",date:"2018-10-01",valor:"1380",desc:null},
  {name:"Bianca Massuia Dezorzi",date:"2019-04-01",valor:"1587",desc:null},
  {name:"Bianca Massuia Dezorzi",date:"2019-09-01",valor:"1800",desc:null},
  {name:"Bianca Massuia Dezorzi",date:"2020-09-01",valor:"2160",desc:null},
  {name:"Bianca Massuia Dezorzi",date:"2021-05-01",valor:"2592",desc:null},
  {name:"Bianca Massuia Dezorzi",date:"2021-10-01",valor:"3000",desc:null},
  {name:"Bianca Massuia Dezorzi",date:"2022-01-01",valor:"3304.8",desc:null},
  {name:"Bianca Massuia Dezorzi",date:"2022-08-01",valor:"3635.28",desc:null},
  {name:"Bianca Massuia Dezorzi",date:"2023-01-01",valor:"3998.81",desc:null},
  {name:"Bianca Massuia Dezorzi",date:"2023-03-01",valor:"4398.81",desc:null},
  {name:"Bianca Massuia Dezorzi",date:"2023-10-01",valor:"5000",desc:null},
  {name:"Bianca Massuia Dezorzi",date:"2024-02-01",valor:"6000",desc:null},
  {name:"Bianca Massuia Dezorzi",date:"2024-02-02",valor:"6240",desc:null},
  {name:"Bianca Massuia Dezorzi",date:"2025-01-01",valor:"6537.65",desc:null},
  {name:"Bianca Massuia Dezorzi",date:"2025-10-01",valor:"7000",desc:null},
  {name:"Fabricio Alves da Cruz",date:"2026-01-01",valor:"5720",desc:null},
  {name:"William Matos Ferreira",date:"2024-08-01",valor:"8000",desc:null},
  {name:"William Matos Ferreira",date:"2025-04-01",valor:"8500",desc:null},
  {name:"William Matos Ferreira",date:"2026-02-01",valor:"Estac +R$270,00",desc:null},
  {name:"Lucas Matos Rodrigues Silveira",date:"2025-10-01",valor:"2500",desc:null},
  {name:"Lucas Matos Rodrigues Silveira",date:"2026-01-01",valor:"2600",desc:null},
  {name:"Letícia Desiderio",date:"2022-05-02",valor:"3500",desc:null},
  {name:"Letícia Desiderio",date:"2024-02-01",valor:"4000",desc:null},
  {name:"Letícia Desiderio",date:"2025-07-01",valor:"5000",desc:null},
  {name:"Carla Zola",date:"2023-08-08",valor:"2000",desc:null},
  {name:"Carla Zola",date:"2024-08-07",valor:"3500",desc:null},
  {name:"Carla Zola",date:"2025-07-01",valor:"4000",desc:null},
  {name:"Carla Zola",date:"2026-02-01",valor:"4400",desc:null},
  {name:"Matheus Gomes Lopes da Silva",date:"2025-07-01",valor:"5000",desc:null},
  {name:"Matheus Morais Pereira",date:"2024-07-01",valor:"3500",desc:null},
  {name:"Matheus Morais Pereira",date:"2024-02-01",valor:"4000",desc:null},
  {name:"Matheus Morais Pereira",date:"2025-07-01",valor:"5000",desc:null},
  {name:"Cauê Mendonça de Sousa",date:"2026-01-01",valor:"2600",desc:null},
  {name:"Matheus Sarcineli",date:"2026-02-01",valor:"4000",desc:null},
  {name:"Walison Araujo Santana",date:"2025-10-01",valor:"4626.9",desc:null},
  {name:"Cristhian Felipe da Silva",date:"2024-06-03",valor:"3250",desc:null},
  {name:"Cristhian Felipe da Silva",date:"2024-11-12",valor:"4500",desc:null},
  {name:"Cristhian Felipe da Silva",date:"2026-02-01",valor:"5250",desc:null},
  {name:"Samara Caldas",date:"2024-06-20",valor:"2500",desc:null},
  {name:"Samara Caldas",date:"2025-01-01",valor:"2559.75",desc:null},
  {name:"Samara Caldas",date:"2026-01-01",valor:"2662.14",desc:null},
  {name:"Samara Caldas",date:"2026-02-01",valor:"VA + R$300,00",desc:null},
  {name:"Samara Caldas",date:"2026-02-01",valor:"2928.35",desc:null},
  {name:"João Pedro Farias Costa",date:"2023-08-29",valor:"4200",desc:null},
  {name:"João Pedro Farias Costa",date:"2024-09-27",valor:"4400",desc:null},
  {name:"João Pedro Farias Costa",date:"2025-07-01",valor:"4539.48",desc:null},
  {name:"Natália Zanella",date:"2023-08-29",valor:"3300",desc:null},
  {name:"Natália Zanella",date:"2024-09-27",valor:"3700",desc:null},
  {name:"Natália Zanella",date:"2025-07-01",valor:"4539.48",desc:null},
  {name:"Bruna Ruri Kobayachi",date:"2023-08-08",valor:"2500",desc:null},
  {name:"Bruna Ruri Kobayachi",date:"2024-08-07",valor:"3500",desc:null},
  {name:"Bruna Ruri Kobayachi",date:"2025-07-01",valor:"4000",desc:null},
  {name:"Bruna Ruri Kobayachi",date:"2025-10-01",valor:"5000",desc:null},
  {name:"Bruna Ruri Kobayachi",date:"2026-02-01",valor:"Nível Pleno",desc:null},
  {name:"Patrick Martins",date:"2025-07-01",valor:"4500",desc:null},
  {name:"Patrick Martins",date:"2026-02-01",valor:"5000",desc:null},
  {name:"Cezar Fernando Barbosa Cangussu",date:"2025-07-17",valor:"6000",desc:null},
  {name:"Jonas de Oliveria Gomes",date:"2025-07-11",valor:"6000",desc:null},
  {name:"Leandro Henrique Siqueira",date:"2023-08-08",valor:"4000",desc:null},
  {name:"Leandro Henrique Siqueira",date:"2024-09-26",valor:"5000",desc:null},
  {name:"Leandro Henrique Siqueira",date:"2025-10-01",valor:"6000",desc:null},
  {name:"Samuel Dantas Cavalcante Evangelista",date:"2025-07-11",valor:"6000",desc:null},
  {name:"Ariel Pimenta Leite",date:"2023-08-29",valor:"5000",desc:null},
  {name:"Ariel Pimenta Leite",date:"2024-09-27",valor:"6000",desc:null},
  {name:"Ariel Pimenta Leite",date:"2025-10-01",valor:"6350",desc:null},
  {name:"Matheus Louly",date:"2024-02-14",valor:"6000",desc:null},
  {name:"Matheus Louly",date:"2024-10-30",valor:"7000",desc:null},
  {name:"Matheus Louly",date:"2025-07-01",valor:"7500",desc:null},
  {name:"Giovanna Avila",date:"2026-01-01",valor:"2600",desc:null},
  {name:"Renan Barbosa",date:"2023-12-04",valor:"2500",desc:null},
  {name:"Renan Barbosa",date:"2024-02-01",valor:"2508.25",desc:null},
  {name:"Renan Barbosa",date:"2024-03-04",valor:"3000",desc:null},
  {name:"Renan Barbosa",date:"2024-07-01",valor:"3500",desc:null},
  {name:"Renan Barbosa",date:"2025-01-01",valor:"3666.95",desc:null},
  {name:"Renan Barbosa",date:"2026-02-01",valor:"VA +R$300,00",desc:null},
  {name:"Renan Barbosa",date:"2026-01-01",valor:"3813.63",desc:null},
  {name:"Carlos Eduardo Ribeiro Mathias",date:"2024-07-04",valor:"5700",desc:null},
  {name:"Carlos Eduardo Ribeiro Mathias",date:"2025-01-01",valor:"8000",desc:null},
  {name:"Nelson da Silva Jaime",date:"2026-02-01",valor:"13553.8",desc:null},
  {name:"José Icaro Bezzera Clemente",date:"2024-03-19",valor:"8000",desc:null},
  {name:"José Icaro Bezzera Clemente",date:"2024-08-01",valor:"20000",desc:null},
  {name:"José Icaro Bezzera Clemente",date:"2026-02-01",valor:"10000",desc:null},
  {name:"José Icaro Bezzera Clemente",date:"2026-02-01",valor:"Redução CH para 80hs/mês",desc:null},
  {name:"Dirceu Mattos",date:"2021-10-26",valor:"18000",desc:null},
  {name:"Dirceu Mattos",date:"2024-09-01",valor:"21000",desc:null},
  {name:"Alexandre das Dores Nunes",date:"2023-05-02",valor:"3000",desc:null},
  {name:"Alexandre das Dores Nunes",date:"2024-01-01",valor:"3080.1",desc:null},
  {name:"Alexandre das Dores Nunes",date:"2025-01-01",valor:"3227.02",desc:null},
  {name:"Alexandre das Dores Nunes",date:"2026-01-01",valor:"3356.1",desc:null},
  {name:"Ana Carollina Correa",date:"2024-04-19",valor:"3000",desc:null},
  {name:"Ana Carollina Correa",date:"2024-07-01",valor:"3600",desc:null},
  {name:"Ana Carollina Correa",date:"2025-01-01",valor:"3714.48",desc:null},
  {name:"Ana Carollina Correa",date:"2025-04-01",valor:"4200",desc:null},
  {name:"Ana Carollina Correa",date:"2025-09-01",valor:"VA +R$1.000,00",desc:null},
  {name:"Ana Carollina Correa",date:"2026-01-01",valor:"4368",desc:null},
  {name:"Roberta Silva",date:"2025-09-01",valor:"VA +R$1.000,00",desc:null},
  {name:"Roberta Silva",date:"2026-01-01",valor:"4368",desc:null},
  {name:"Jessica Castro Freire",date:"2024-10-07",valor:"8000",desc:null},
  {name:"Jessica Castro Freire",date:"2025-01-20",valor:"8095.2",desc:null},
  {name:"Jessica Castro Freire",date:"2026-01-01",valor:"8419.01",desc:null},
  {name:"Karine Tedesco Faleiro",date:"2023-03-01",valor:"10769",desc:null},
  {name:"Karine Tedesco Faleiro",date:"2024-11-01",valor:"11845.9",desc:null},
  {name:"Alexandre Hideki Siroma",date:"1970-01-01",valor:"",desc:"Tem Bolsa de Estudos"},
  {name:"Dário Domingues",date:"2023-01-12",valor:"70",desc:null},
  {name:"Dário Domingues",date:"2025-03-01",valor:"9000",desc:null},
  {name:"Dário Domingues",date:"2025-07-01",valor:"10000",desc:null},
  {name:"Dário Domingues",date:"2026-02-01",valor:"10500",desc:null},
  {name:"Luciano Arantes Monçao",date:"2023-03-20",valor:"8000",desc:null},
  {name:"Luciano Arantes Monçao",date:"2024-07-01",valor:"11000",desc:null},
  {name:"Luciano Arantes Monçao",date:"2025-10-01",valor:"+ R$1.000 AJ",desc:null},
  {name:"Mateus Santos Ferreira",date:"2023-09-19",valor:"4000",desc:null},
  {name:"Mateus Santos Ferreira",date:"2024-01-01",valor:"4040",desc:null},
  {name:"Mateus Santos Ferreira",date:"2025-07-01",valor:"9300",desc:null},
  {name:"Mateus Santos Ferreira",date:"2026-02-01",valor:"11000",desc:null},
  {name:"Jonathas Aparecido de Oliveira",date:"2021-02-15",valor:"3000",desc:null},
  {name:"Jonathas Aparecido de Oliveira",date:"2022-02-15",valor:"4000",desc:null},
  {name:"Jonathas Aparecido de Oliveira",date:"2022-05-01",valor:"4400",desc:null},
  {name:"Jonathas Aparecido de Oliveira",date:"2023-07-06",valor:"6500",desc:null},
  {name:"Jonathas Aparecido de Oliveira",date:"2023-10-01",valor:"8000",desc:null},
  {name:"Jonathas Aparecido de Oliveira",date:"2024-02-01",valor:"12000",desc:null},
  {name:"Jonathas Aparecido de Oliveira",date:"2024-07-01",valor:"13500",desc:null},
  {name:"Jonathas Aparecido de Oliveira",date:"2025-10-01",valor:"14200",desc:null},
  {name:"Daniel Junior",date:"2025-07-01",valor:"15500",desc:null},
  {name:"Daniel Junior",date:"2025-07-01",valor:"Alterada função para Tech Lead",desc:null},
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch teams and job_titles for lookups
    const { data: teamsData } = await supabaseAdmin.from("teams").select("id, name");
    const { data: jtData } = await supabaseAdmin.from("job_titles").select("id, label");

    const teamMap = new Map<string, string>();
    for (const t of teamsData || []) teamMap.set(t.name.toLowerCase(), t.id);

    const jtMap = new Map<string, string>();
    for (const j of jtData || []) jtMap.set(j.label.toLowerCase(), j.id);

    // Insert people
    let peopleInserted = 0;
    let peopleErrors = 0;
    const nameToId = new Map<string, string>();

    for (const p of people) {
      const cargoId = jtMap.get(p.c.toLowerCase()) || null;
      const teamId = teamMap.get(p.d.toLowerCase()) || null;

      const record: Record<string, unknown> = {
        nome: p.n,
        tipo_vinculo: p.tv,
        cargo_id: cargoId,
        team_id: teamId,
        remuneracao_mensal: p.rm,
        beneficios: p.b,
        situacao: p.sit,
        nivel: p.nv,
        trilha: p.tr,
      };
      if (p.pj) record.projeto = p.pj;

      if (p.obs) record.observacoes = p.obs;
      if (p.cg) record.comite_gestor = p.cg;
      if (p.la) record.local_atuacao = p.la;
      if (p.da) record.data_admissao = p.da;
      if (p.dd) record.data_desligamento = p.dd;
      if (p.td) record.tipo_desligamento = p.td;
      if (p.od) record.observacoes_desligamento = p.od;
      if (p.ca && p.ca !== "-") record.cargo_antigo = p.ca;
      if (p.rii !== null && p.rii !== undefined) record.remuneracao_ii = p.rii;

      const { data, error } = await supabaseAdmin
        .from("hr_people")
        .insert(record)
        .select("id")
        .single();

      if (error) {
        console.error(`Error inserting ${p.n}:`, error.message);
        peopleErrors++;
      } else {
        nameToId.set(p.n, data.id);
        peopleInserted++;
      }
    }

    // Insert timeline events
    let tlInserted = 0;
    let tlErrors = 0;
    let tlSkipped = 0;

    for (const ev of timeline) {
      const personId = nameToId.get(ev.name);
      if (!personId) {
        tlSkipped++;
        continue;
      }

      // Skip invalid dates
      if (!ev.date || !/^\d{4}-\d{2}-\d{2}$/.test(ev.date)) {
        tlSkipped++;
        continue;
      }

      // Determine if value is numeric
      const numVal = parseFloat(ev.valor);
      const isNumeric = !isNaN(numVal) && /^[\d.]+$/.test(ev.valor.trim());

      const record: Record<string, unknown> = {
        person_id: personId,
        event_date: ev.date,
        atualizar_remuneracao: false,
      };

      if (isNumeric) {
        record.ocorrencia = "reajuste";
        record.descricao = `Remuneração: R$ ${numVal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
        record.valor = numVal;
        record.remuneracao_apos = numVal;
      } else {
        record.ocorrencia = "observacao";
        record.descricao = ev.desc || ev.valor;
      }

      const { error } = await supabaseAdmin.from("hr_timeline").insert(record);

      if (error) {
        console.error(`Error inserting timeline for ${ev.name}:`, error.message);
        tlErrors++;
      } else {
        tlInserted++;
      }
    }

    const result = {
      people: { inserted: peopleInserted, errors: peopleErrors, total: people.length },
      timeline: { inserted: tlInserted, errors: tlErrors, skipped: tlSkipped, total: timeline.length },
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
