import React from 'react';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/layout/PageHeader';
import { AIPageLayout } from '@/components/ai/AIPageLayout';
import { EmptyState } from '@/components/ui/empty-state';
import { Database } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

export default function AILogsPage() {
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <PageHeader
        title="Fontes e Logs"
        description="Registro de fontes de dados e logs das análises realizadas"
      />
      <AIPageLayout>
        <EmptyState
          icon={Database}
          title="Em breve"
          description="O registro de fontes e logs das análises estará disponível em uma próxima versão."
        />
      </AIPageLayout>
    </motion.div>
  );
}
