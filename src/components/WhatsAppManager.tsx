import React, { useState, useEffect } from 'react';
import { wahaService } from '@/services/wahaService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Power, PowerOff, QrCode } from 'lucide-react';
import { toast } from 'sonner';

interface WhatsAppManagerProps {
  onInstanceReady: (instanceName: string) => void;
}

export function WhatsAppManager({ onInstanceReady }: WhatsAppManagerProps) {
  const [instanceName] = useState('default');
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const data = await wahaService.getStatus(instanceName);
      setStatus(data);
      if (data.qr) {
        setScreenshot(data.qr);
      }
      if (data.status === 'WORKING') {
        onInstanceReady(instanceName);
      }
    } catch (error) {
      console.error('Failed to fetch status', error);
      setStatus(null);
    }
  };

  const handleStart = async () => {
    setLoading(true);
    try {
      await wahaService.startInstance(instanceName);
      toast.success('Starting connection...');
      setTimeout(fetchStatus, 2000);
    } catch (error) {
      toast.error('Failed to start connection');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      await wahaService.stopInstance(instanceName);
      toast.success('Instance stopped');
      fetchStatus();
    } catch (error) {
      toast.error('Failed to stop instance');
    } finally {
      setLoading(false);
    }
  };

  const handleScreenshot = async () => {
    try {
      const url = await wahaService.getScreenshot(instanceName);
      setScreenshot(url);
    } catch (error) {
      toast.error('Failed to get QR Code');
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>WhatsApp Instance</CardTitle>
          {status && (
            <Badge variant={status.status === 'WORKING' ? 'default' : 'destructive'}>
              {status.status}
            </Badge>
          )}
        </div>
        <CardDescription>Manage your WhatsApp connection</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status?.status === 'SCAN_QR_CODE' && (
          <div className="flex flex-col items-center space-y-4">
            <div className="bg-white p-4 rounded-lg border">
              {screenshot ? (
                <img src={screenshot} alt="QR Code" className="w-64 h-64" />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center bg-muted">
                  <QrCode className="w-12 h-12 text-muted-foreground" />
                </div>
              )}
            </div>
            <Button onClick={handleScreenshot} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh QR Code
            </Button>
          </div>
        )}

        {status?.status === 'STOPPED' && (
          <div className="text-center py-8 text-muted-foreground">
            Instance is stopped. Start it to connect.
          </div>
        )}

        {status?.status === 'WORKING' && (
          <div className="text-center py-8 text-green-600 font-medium">
            Connected and ready!
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={fetchStatus} 
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        <div className="space-x-2">
          {status?.status === 'STOPPED' ? (
            <Button onClick={handleStart} disabled={loading}>
              <Power className="w-4 h-4 mr-2" />
              Start
            </Button>
          ) : (
            <Button variant="destructive" onClick={handleStop} disabled={loading}>
              <PowerOff className="w-4 h-4 mr-2" />
              Stop
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
