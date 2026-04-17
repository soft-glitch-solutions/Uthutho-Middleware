import { useState, useCallback, } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ArrowLeft, Navigation, MapPin, DollarSign, ListOrdered,
  Upload, Image as ImageIcon, Loader2, CheckCircle2, AlertCircle, X,
  ExternalLink, Maximize2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface StopDetailsProps {
  stop: any;
  onBack: () => void;
  onRefresh: () => void;
}

const StopDetails: React.FC<StopDetailsProps> = ({ stop, onBack, onRefresh }) => {
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState(stop.image_url);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${stop.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('stops')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('stops')
        .getPublicUrl(filePath);

      // 3. Update database
      const { error: updateError } = await supabase
        .from('stops')
        .update({ image_url: publicUrl })
        .eq('id', stop.id);

      if (updateError) throw updateError;

      setImageUrl(publicUrl);
      onRefresh();
      toast({
        title: "Success",
        description: "Stop image updated successfully.",
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "An error occurred while uploading the image.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setIsDragging(false);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  }, [stop.id]);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={onBack}
          className="rounded-xl border-border/50 hover:bg-muted transition-all duration-300"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 bg-transport-stop/10 rounded-xl">
              <Navigation className="w-6 h-6 text-transport-stop" />
            </div>
            {stop.name}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold bg-muted/30">
              ID: {stop.id.substring(0, 8)}...
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Details Card */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="transport-card overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4">
              <CardTitle className="text-xl flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-primary" />
                Stop Visual Representation
              </CardTitle>
              <CardDescription>View and manage the image for this transport stop</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="relative group aspect-video bg-muted/20 flex items-center justify-center overflow-hidden">
                {imageUrl ? (
                  <>
                    <img
                      src={imageUrl}
                      alt={stop.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3">
                      <Button variant="secondary" size="sm" className="gap-2" onClick={() => window.open(imageUrl, '_blank')}>
                        <Maximize2 className="w-4 h-4" /> View Full Size
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-muted-foreground p-12">
                    <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
                    <p className="font-medium">No image available for this stop</p>
                  </div>
                )}

                {uploading && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 transition-all duration-300">
                    <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                    <p className="font-bold text-lg animate-pulse">Uploading Image...</p>
                  </div>
                )}
              </div>

              {/* Upload Dropzone */}
              <div className="p-6 border-t border-border/50 bg-muted/10">
                <div
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  className={`
                    relative cursor-pointer transition-all duration-300 rounded-2xl border-2 border-dashed
                    flex flex-col items-center justify-center py-10 px-6 text-center
                    ${isDragging ? 'border-primary bg-primary/5 scale-[0.99]' : 'border-border/60 hover:border-primary/50 hover:bg-primary/5'}
                  `}
                >
                  <Input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                    accept="image/*"
                  />
                  <div className={`p-4 rounded-full mb-4 transition-colors duration-300 ${isDragging ? 'bg-primary/20' : 'bg-muted/50'}`}>
                    <Upload className={`w-8 h-8 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <h4 className="text-lg font-bold mb-1">Click or drag image to upload</h4>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Recommended size: 1200x800px. Supports PNG, JPG or WEBP.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Column */}
        <div className="space-y-6">
          <Card className="transport-card">
            <CardHeader>
              <CardTitle className="text-lg">Stop Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <span className="text-sm text-muted-foreground">Coordinates</span>
                  </div>
                  <span className="text-sm font-mono font-bold">{stop.latitude.toFixed(6)}, {stop.longitude.toFixed(6)}</span>
                </div>

                <Separator className="opacity-50" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <span className="text-sm text-muted-foreground">Base Cost</span>
                  </div>
                  <span className="text-sm font-bold text-green-600">{stop.cost ? `R${stop.cost}` : 'Not set'}</span>
                </div>

                <Separator className="opacity-50" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                      <ListOrdered className="w-4 h-4" />
                    </div>
                    <span className="text-sm text-muted-foreground">Order Number</span>
                  </div>
                  <Badge variant="secondary" className="font-bold">{stop.order_number || 'N/A'}</Badge>
                </div>
              </div>

              <div className="pt-4">
                <Button variant="outline" className="w-full gap-2 border-border/50 hover:bg-muted" onClick={() => window.open(`https://www.google.com/maps?q=${stop.latitude},${stop.longitude}`, '_blank')}>
                  <ExternalLink className="w-4 h-4" /> View on Google Maps
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="transport-card bg-primary/[0.02] border-primary/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-primary" /> System Info
              </CardTitle>
            </CardHeader>
            <CardContent className="text-[11px] text-muted-foreground space-y-2">
              <div className="flex justify-between">
                <span>Created At</span>
                <span>{new Date(stop.created_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Last Updated</span>
                <span>{new Date(stop.updated_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Organisation ID</span>
                <span className="font-mono">{stop.organisation_id || 'Global'}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StopDetails;
