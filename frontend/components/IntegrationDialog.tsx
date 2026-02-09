import { Dialog } from "@/components/ui/dialog";
import { IntegrationManager } from "./IntegrationManager";
import { useLanguage } from "./LanguageProvider";

interface IntegrationDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export function IntegrationDialog({ isOpen, onClose }: IntegrationDialogProps) {
    const { t } = useLanguage();

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title={t('manage_integrations') || "Manage Integrations"}>
            <div className="max-h-[80vh] overflow-y-auto pr-1">
                <IntegrationManager />
            </div>
        </Dialog>
    );
}
