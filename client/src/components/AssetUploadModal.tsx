import { useState, useCallback } from 'react';
import { Upload, X, ChevronRight, AlertCircle } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ASSET_CATEGORIES, 
  getAssetType,
  type AssetType 
} from '@shared/brand-asset-types';

export interface AssetMetadata {
  assetType: string;
  name: string;
  description?: string;
  tags?: string[];
  personInfo?: {
    name?: string;
    title?: string;
    credentials?: string;
    consentObtained: boolean;
  };
  productInfo?: {
    productName?: string;
    sku?: string;
  };
}

interface AssetUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File, metadata: AssetMetadata) => void;
}

type Step = 'select-type' | 'upload' | 'details';

export function AssetUploadModal({
  isOpen,
  onClose,
  onUpload,
}: AssetUploadModalProps) {
  const [step, setStep] = useState<Step>('select-type');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [personName, setPersonName] = useState('');
  const [personTitle, setPersonTitle] = useState('');
  const [personCredentials, setPersonCredentials] = useState('');
  const [consentObtained, setConsentObtained] = useState(false);
  const [productName, setProductName] = useState('');
  const [productSku, setProductSku] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const assetType = selectedType ? getAssetType(selectedType) : null;

  const renderIcon = (iconName: string, className?: string) => {
    const Icon = LucideIcons[iconName as keyof typeof LucideIcons] as React.FC<{ className?: string }>;
    return Icon ? <Icon className={className || "w-5 h-5"} /> : null;
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    if (selectedFile.type.startsWith('image/') || selectedFile.type.startsWith('video/')) {
      const url = URL.createObjectURL(selectedFile);
      setPreview(url);
    }

    if (!name) {
      setName(selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
    }

    setStep('details');
  }, [name]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;

    setFile(droppedFile);

    if (droppedFile.type.startsWith('image/') || droppedFile.type.startsWith('video/')) {
      const url = URL.createObjectURL(droppedFile);
      setPreview(url);
    }

    if (!name) {
      setName(droppedFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
    }

    setStep('details');
  }, [name]);

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const validateUpload = useCallback((): boolean => {
    const errors: string[] = [];

    if (!file) {
      errors.push('Please select a file');
    }

    if (!name.trim()) {
      errors.push('Please enter a name for this asset');
    }

    if (file && assetType?.requirements?.recommendedFormat) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension && !assetType.requirements.recommendedFormat.includes(extension)) {
        errors.push(`Recommended formats: ${assetType.requirements.recommendedFormat.join(', ')}`);
      }
    }

    if (assetType?.category === 'people' && assetType.personMetadata?.requiresConsent) {
      if (!consentObtained) {
        errors.push("Please confirm you have consent to use this person's image");
      }
    }

    if (assetType?.personMetadata?.requiresName === true && !personName.trim()) {
      errors.push('Person name is required for this asset type');
    }

    if (assetType?.personMetadata?.requiresTitle === true && !personTitle.trim()) {
      errors.push('Person title is required for this asset type');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  }, [file, name, assetType, consentObtained, personName, personTitle]);

  const handleUpload = useCallback(() => {
    if (!validateUpload() || !file || !selectedType) return;

    const metadata: AssetMetadata = {
      assetType: selectedType,
      name: name.trim(),
      description: description.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
    };

    if (assetType?.category === 'people') {
      metadata.personInfo = {
        name: personName.trim() || undefined,
        title: personTitle.trim() || undefined,
        credentials: personCredentials.trim() || undefined,
        consentObtained,
      };
    }

    if (assetType?.category === 'products') {
      metadata.productInfo = {
        productName: productName.trim() || undefined,
        sku: productSku.trim() || undefined,
      };
    }

    onUpload(file, metadata);
    handleClose();
  }, [file, selectedType, name, description, tags, assetType, personName, personTitle, personCredentials, consentObtained, productName, productSku, validateUpload, onUpload]);

  const handleClose = () => {
    setStep('select-type');
    setSelectedCategory(null);
    setSelectedType(null);
    setFile(null);
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    setName('');
    setDescription('');
    setTags([]);
    setTagInput('');
    setPersonName('');
    setPersonTitle('');
    setPersonCredentials('');
    setConsentObtained(false);
    setProductName('');
    setProductSku('');
    setValidationErrors([]);
    onClose();
  };

  const handleBack = () => {
    if (step === 'details') {
      setStep('upload');
    } else if (step === 'upload') {
      setSelectedType(null);
      setStep('select-type');
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(selectedCategory === categoryId ? null : categoryId);
  };

  const handleTypeSelect = (type: AssetType) => {
    setSelectedType(type.id);
    setStep('upload');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === 'select-type' && 'What are you uploading?'}
            {step === 'upload' && `Upload ${assetType?.label}`}
            {step === 'details' && 'Asset Details'}
          </DialogTitle>
        </DialogHeader>

        {step === 'select-type' && (
          <ScrollArea className="flex-1 pr-4 max-h-[70vh]">
            <div className="space-y-3">
              {ASSET_CATEGORIES.map((category) => (
                <div key={category.id} className="space-y-2">
                  <button
                    type="button"
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                      selectedCategory === category.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleCategoryClick(category.id)}
                  >
                    {renderIcon(category.icon)}
                    <div className="flex-1">
                      <div className="font-medium">{category.label}</div>
                      <div className="text-sm text-muted-foreground">{category.description}</div>
                    </div>
                    <ChevronRight className={`w-5 h-5 transition-transform ${
                      selectedCategory === category.id ? 'rotate-90' : ''
                    }`} />
                  </button>

                  {selectedCategory === category.id && (
                    <div className="ml-4 max-h-[280px] overflow-y-auto pr-1">
                      <div className="grid grid-cols-2 gap-2">
                        {category.types.map((type) => (
                          <button
                            key={type.id}
                            type="button"
                            className={`p-3 rounded-lg border text-left transition-colors ${
                              selectedType === type.id
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'
                            }`}
                            onClick={() => handleTypeSelect(type)}
                          >
                            <div className="flex items-center gap-2">
                              {renderIcon(type.icon, "w-4 h-4")}
                              <span className="font-medium text-sm">{type.label}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {type.description}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {step === 'upload' && assetType && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              {renderIcon(assetType.icon)}
              <div className="flex-1">
                <div className="font-medium">{assetType.label}</div>
                <div className="text-sm text-muted-foreground">{assetType.description}</div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedType(null);
                  setStep('select-type');
                }}
              >
                Change
              </Button>
            </div>

            {assetType.requirements && (
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  <strong>Recommended format:</strong>{' '}
                  {assetType.requirements.recommendedFormat?.join(', ').toUpperCase()}
                </p>
                {assetType.requirements.minResolution && (
                  <p>
                    <strong>Min resolution:</strong>{' '}
                    {assetType.requirements.minResolution.width}x
                    {assetType.requirements.minResolution.height}
                  </p>
                )}
                {assetType.requirements.transparentBackground === true && (
                  <p className="text-amber-600">
                    Transparent background required
                  </p>
                )}
                {assetType.requirements.transparentBackground === 'recommended' && (
                  <p className="text-primary">
                    Transparent background recommended
                  </p>
                )}
              </div>
            )}

            <label 
              className="block cursor-pointer"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  Click to upload or drag and drop
                </p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  {assetType.requirements?.recommendedFormat?.join(', ').toUpperCase() || 'Any format'}
                </p>
              </div>
              <input
                type="file"
                className="hidden"
                accept={assetType.requirements?.recommendedFormat?.map(f => `.${f}`).join(',')}
                onChange={handleFileSelect}
              />
            </label>

            {assetType.examples && assetType.examples.length > 0 && (
              <div className="text-sm">
                <strong>Examples:</strong>
                <ul className="list-disc list-inside text-muted-foreground mt-1">
                  {assetType.examples.map((ex, i) => (
                    <li key={i}>{ex}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {step === 'details' && assetType && (
          <ScrollArea className="flex-1 pr-4 max-h-[70vh]">
            <div className="space-y-4">
              {preview && (
                <div className="relative">
                  {file?.type.startsWith('image/') ? (
                    <img
                      src={preview}
                      alt="Preview"
                      className="w-full h-48 object-contain bg-muted rounded-lg"
                    />
                  ) : file?.type.startsWith('video/') ? (
                    <video
                      src={preview}
                      controls
                      className="w-full h-48 object-contain bg-muted rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
                      <span className="text-muted-foreground">{file?.name}</span>
                    </div>
                  )}
                  <Badge className="absolute top-2 left-2">
                    {assetType.label}
                  </Badge>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <Label htmlFor="name">Asset Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Pine Hill Farm Main Logo"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of this asset"
                  />
                </div>

                <div>
                  <Label htmlFor="tags">Tags (optional)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="tags"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="Add a tag"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={addTag}>
                      Add
                    </Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="gap-1">
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="hover:text-destructive"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {assetType.category === 'products' && (
                <div className="space-y-3 p-3 bg-muted rounded-lg">
                  <h4 className="font-medium text-sm">Product Information</h4>
                  <div>
                    <Label htmlFor="productName">Product Name</Label>
                    <Input
                      id="productName"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      placeholder="e.g., Black Cohosh Extract"
                    />
                  </div>
                  <div>
                    <Label htmlFor="productSku">SKU (optional)</Label>
                    <Input
                      id="productSku"
                      value={productSku}
                      onChange={(e) => setProductSku(e.target.value)}
                      placeholder="e.g., PHF-BC-001"
                    />
                  </div>
                </div>
              )}

              {assetType.category === 'people' && (
                <div className="space-y-3 p-3 bg-muted rounded-lg">
                  <h4 className="font-medium text-sm">Person Information</h4>
                  <div>
                    <Label htmlFor="personName">
                      Full Name {assetType.personMetadata?.requiresName === true ? '*' : ''}
                    </Label>
                    <Input
                      id="personName"
                      value={personName}
                      onChange={(e) => setPersonName(e.target.value)}
                      placeholder="e.g., Dr. Sarah Johnson"
                    />
                  </div>
                  <div>
                    <Label htmlFor="personTitle">
                      Title/Role {assetType.personMetadata?.requiresTitle === true ? '*' : ''}
                    </Label>
                    <Input
                      id="personTitle"
                      value={personTitle}
                      onChange={(e) => setPersonTitle(e.target.value)}
                      placeholder="e.g., Chief Science Officer"
                    />
                  </div>
                  {assetType.personMetadata?.requiresCredentials && (
                    <div>
                      <Label htmlFor="personCredentials">Credentials</Label>
                      <Input
                        id="personCredentials"
                        value={personCredentials}
                        onChange={(e) => setPersonCredentials(e.target.value)}
                        placeholder="e.g., PhD, RD, CNS"
                      />
                    </div>
                  )}

                  {assetType.personMetadata?.requiresConsent && (
                    <div className="flex items-start gap-2 pt-2">
                      <Checkbox
                        id="consent"
                        checked={consentObtained}
                        onCheckedChange={(checked) => setConsentObtained(checked === true)}
                      />
                      <label htmlFor="consent" className="text-sm text-muted-foreground cursor-pointer">
                        I confirm that I have obtained permission from this person 
                        to use their image in video content. *
                      </label>
                    </div>
                  )}
                </div>
              )}

              {validationErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    <ul className="list-disc list-inside">
                      {validationErrors.map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </ScrollArea>
        )}

        <div className="flex justify-between pt-4 border-t mt-auto">
          <div>
            {step !== 'select-type' && (
              <Button variant="ghost" onClick={handleBack}>
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            {step === 'details' && (
              <Button onClick={handleUpload}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Asset
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AssetUploadModal;
