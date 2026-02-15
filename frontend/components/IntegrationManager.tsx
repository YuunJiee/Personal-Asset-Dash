"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Trash2, Plus, Key, Wallet, Globe, RefreshCw, Bitcoin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLanguage } from "./LanguageProvider";
import { API_URL } from '@/lib/api';

interface Connection {
    id: number;
    name: string;
    provider: string;
    api_key_masked?: string;
    address?: string;
    is_active: boolean;
}

export function IntegrationManager() {
    const { t } = useLanguage();
    const [connections, setConnections] = useState<Connection[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // New Connection State
    const [newType, setNewType] = useState<string>("pionex");
    const [newName, setNewName] = useState("");
    const [apiKey, setApiKey] = useState("");
    const [apiSecret, setApiSecret] = useState("");
    const [address, setAddress] = useState("");

    const fetchConnections = async () => {
        try {
            const res = await fetch(`${API_URL}/integrations/`);
            if (res.ok) setConnections(await res.json());
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchConnections();
    }, []);

    const handleAdd = async () => {
        setLoading(true);
        try {
            let defaultName = `${newType} Connection`;
            if (newType === 'max') defaultName = 'MAX';
            else if (newType === 'pionex') defaultName = 'Pionex';
            else if (newType === 'binance') defaultName = 'Binance';
            else if (newType === 'wallet') defaultName = 'Wallet';

            const payload = {
                name: newName || defaultName,
                provider: newType,
                api_key: newType === 'wallet' ? null : apiKey,
                api_secret: newType === 'wallet' ? null : apiSecret,
                address: newType === 'wallet' ? address : null
            };

            const res = await fetch(`${API_URL}/integrations/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setIsOpen(false);
                fetchConnections();
                // Reset form
                setNewName("");
                setApiKey("");
                setApiSecret("");
                setAddress("");
            } else {
                alert("Failed to add connection");
            }
        } catch (e) {
            alert("Error adding connection");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure? This will delete the connection and associated assets.")) return;
        try {
            await fetch(`${API_URL}/integrations/${id}`, { method: 'DELETE' });
            fetchConnections();
        } catch (e) {
            console.error(e);
        }
    };

    const handleSync = async (provider: string) => {
        // Trigger sync for all of this provider
        try {
            // Endpoints map 1:1 with provider names (max, pionex, wallet)
            const endpoint = provider;
            const res = await fetch(`${API_URL}/system/sync/${endpoint}`, { method: 'POST' });
            if (res.ok) {
                alert(`Synced ${provider} successfully!`);
                router.refresh();
            } else alert("Sync failed.");
        } catch (e) {
            alert("Sync error.");
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold tracking-tight">{t('integrations')}</h2>
                <Button onClick={() => setIsOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" /> {t('add_connection')}
                </Button>
            </div>

            <div className="flex flex-col gap-4">
                {connections.map(conn => (
                    <div key={conn.id} className="bg-card border border-border rounded-xl p-3 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="p-2 bg-muted rounded-lg shrink-0">
                                {conn.provider === 'pionex' ? <Key className="w-5 h-5 text-orange-500" /> :
                                    conn.provider === 'max' ? <Globe className="w-5 h-5 text-blue-500" /> :
                                        conn.provider === 'binance' ? <Bitcoin className="w-5 h-5 text-yellow-500" /> :
                                            <Wallet className="w-5 h-5 text-purple-500" />}
                            </div>
                            <div className="min-w-0">
                                <div className="font-semibold text-sm truncate">{conn.name}</div>
                                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    <span className="capitalize">{conn.provider}</span>
                                    <span className="opacity-40">•</span>
                                    <span className="font-mono opacity-70 truncate max-w-[150px]">
                                        {conn.provider === 'wallet' ? conn.address : conn.api_key_masked}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <Button variant="outline" className="h-8 px-3 text-xs" onClick={() => handleSync(conn.provider)}>
                                <RefreshCw className="w-3.5 h-3.5 md:mr-1.5" />
                                <span className="hidden md:inline">Sync</span>
                            </Button>
                            <Button variant="ghost" onClick={() => handleDelete(conn.id)} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                ))}

                {connections.length === 0 && (
                    <div className="col-span-full py-8 text-center text-muted-foreground text-sm border border-dashed border-border rounded-xl">
                        {t('no_integrations')}
                    </div>
                )}
            </div>

            <Dialog isOpen={isOpen} onClose={() => setIsOpen(false)} title={t('add_integration')}>
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label>{t('provider_type')}</Label>
                        <Select value={newType} onChange={(e) => setNewType(e.target.value)}>
                            <option value="pionex">Pionex</option>
                            <option value="binance">Binance</option>
                            <option value="max">MAX Exchange</option>
                            <option value="wallet">Web3 Wallet (EVM)</option>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>{t('name_optional')}</Label>
                        <Input placeholder={t('placeholder_account')} value={newName} onChange={e => setNewName(e.target.value)} />
                    </div>

                    {newType === 'wallet' ? (
                        <div className="space-y-2">
                            <Label>{t('wallet_address')}</Label>
                            <Input placeholder={t('placeholder_wallet')} value={address} onChange={e => setAddress(e.target.value)} className="font-mono" />
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <Label>{t('api_key')}</Label>
                                <Input placeholder={t('enter_api_key')} value={apiKey} onChange={e => setApiKey(e.target.value)} className="font-mono" />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('api_secret')}</Label>
                                <Input type="password" placeholder={t('enter_api_secret')} value={apiSecret} onChange={e => setApiSecret(e.target.value)} className="font-mono" />
                            </div>
                        </>
                    )}

                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setIsOpen(false)}>{t('cancel')}</Button>
                        <Button onClick={handleAdd} disabled={loading}>
                            {loading ? t('adding') : t('add_integration')}
                        </Button>
                    </div>
                </div>
            </Dialog>
        </div>
    );
}
