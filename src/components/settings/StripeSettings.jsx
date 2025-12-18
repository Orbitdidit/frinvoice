// Stripe Settings Component
function StripeSettings() {
  const [config, setConfig] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    stripe_publishable_key: "",
    stripe_secret_key: ""
  });
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const configs = await PaymentConfig.filter({ is_active: true });
      if (configs.length > 0) {
        setConfig(configs[0]);
        setFormData({
            stripe_publishable_key: configs[0].stripe_publishable_key,
            stripe_secret_key: configs[0].stripe_secret_key
        });
      } else {
        setConfig(null);
      }
    } catch (error) {
      console.error("Error loading payment config:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      if (config) {
        await PaymentConfig.update(config.id, {
            stripe_publishable_key: formData.stripe_publishable_key,
            stripe_secret_key: formData.stripe_secret_key
        });
      } else {
        await PaymentConfig.create({
            stripe_publishable_key: formData.stripe_publishable_key,
            stripe_secret_key: formData.stripe_secret_key,
            is_active: true
        });
      }
      setIsEditing(false);
      await loadConfig();
    } catch (error) {
      console.error("Error saving payment config:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
        <div className="flex justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <svg className="w-8 h-8" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11.606 14.124c0-2.036 1.838-2.736 4.618-2.736 1.954 0 3.796.476 4.962 1.054v-4.66c-1.122-.494-2.836-.894-5.112-.894-4.992 0-8.242 2.656-8.242 7.558 0 5.86 8.072 6.16 8.072 9.098 0 1.256-1.504 1.88-3.608 1.88-2.188 0-4.32-.736-5.83-1.636v4.86c1.6.666 3.658 1.106 5.892 1.106 5.394 0 8.638-2.654 8.638-7.79 0-6.02-8.39-6.316-8.39-9.158 0-1.022 1.144-1.682 3.018-1.682h-.018z" fill="#635bff"/>
                    </svg>
                </div>
                <div>
                    <h3 className="font-bold text-slate-900 text-lg">Stripe Integration</h3>
                    <p className="text-slate-600 text-sm">
                        {config ? "Connected with custom keys" : "Using default platform keys"}
                    </p>
                </div>
            </div>
            
            {!isEditing && (
                <Button 
                    onClick={() => setIsEditing(true)}
                    variant="outline" 
                    className="border-purple-200 text-purple-700 hover:bg-purple-50"
                >
                    <SettingsIcon className="w-4 h-4 mr-2" />
                    Configure Keys
                </Button>
            )}
        </div>

        {isEditing ? (
            <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4 pt-4 border-t border-slate-200"
            >
                <div className="space-y-2">
                    <Label>Publishable Key (pk_...)</Label>
                    <Input 
                        value={formData.stripe_publishable_key}
                        onChange={(e) => setFormData({...formData, stripe_publishable_key: e.target.value})}
                        placeholder="pk_live_..."
                        className="font-mono text-sm"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Secret Key (sk_...)</Label>
                    <div className="relative">
                        <Input 
                            type={showSecret ? "text" : "password"}
                            value={formData.stripe_secret_key}
                            onChange={(e) => setFormData({...formData, stripe_secret_key: e.target.value})}
                            placeholder="sk_live_..."
                            className="font-mono text-sm pr-10"
                        />
                        <button 
                            type="button"
                            onClick={() => setShowSecret(!showSecret)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    <p className="text-xs text-slate-500">
                        <AlertCircle className="w-3 h-3 inline mr-1" />
                        These keys are stored securely and used only for your invoices.
                    </p>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                    <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700 text-white">Save Configuration</Button>
                </div>
            </motion.div>
        ) : (
             config ? (
                 <div className="mt-4 pt-4 border-t border-slate-200">
                     <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-2 rounded-lg text-sm w-fit">
                         <CheckCircle2 className="w-4 h-4" />
                         <span className="font-medium">Custom keys configured</span>
                     </div>
                 </div>
             ) : (
                <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="flex items-center gap-2 text-slate-600 bg-slate-100 px-3 py-2 rounded-lg text-sm w-fit">
                         <AlertCircle className="w-4 h-4" />
                         <span>Using system default keys</span>
                     </div>
                </div>
             )
        )}
      </div>

      <div className="text-sm text-slate-500 bg-blue-50 p-4 rounded-lg border border-blue-100">
        <h4 className="font-semibold text-blue-900 mb-1 flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            How payments work
        </h4>
        <p>
            When you add your own Stripe keys, payments from your clients go <strong>directly</strong> to your Stripe account. 
            If you don't configure keys, the system may use default platform keys (if available) or payments may not work.
        </p>
      </div>
    </div>
  );
}