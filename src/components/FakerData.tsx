import { useState } from "react";
import { faker, allLocales } from '@faker-js/faker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Trash2 } from "lucide-react";

const FAKER_METHODS = {
  "Personal": {
    "firstName": { path: "person.firstName", label: "First Name" },
    "lastName": { path: "person.lastName", label: "Last Name" },
    "fullName": { path: "person.fullName", label: "Full Name" },
    "gender": { path: "person.gender", label: "Gender" },
    "jobTitle": { path: "person.jobTitle", label: "Job Title" },
  },
  "Contact": {
    "email": { path: "internet.email", label: "Email" },
    "userName": { path: "internet.userName", label: "Username" },
    "password": { path: "internet.password", label: "Password" },
    "phoneNumber": { path: "phone.number", label: "Phone Number" },
  },
  "Address": {
    "streetAddress": { path: "location.streetAddress", label: "Street Address" },
    "city": { path: "location.city", label: "City" },
    "state": { path: "location.state", label: "State" },
    "zipCode": { path: "location.zipCode", label: "Zip Code" },
    "country": { path: "location.country", label: "Country" },
  },
  "Internet": {
    "url": { path: "internet.url", label: "URL" },
    "domainName": { path: "internet.domainName", label: "Domain Name" },
    "ip": { path: "internet.ip", label: "IP Address" },
    "macAddress": { path: "internet.mac", label: "MAC Address" },
    "userAgent": { path: "internet.userAgent", label: "User Agent" },
  },
  "Finance": {
    "creditCardNumber": { path: "finance.creditCardNumber", label: "Credit Card Number" },
    "creditCardCvv": { path: "finance.creditCardCVV", label: "CVV" },
    "currencyName": { path: "finance.currencyName", label: "Currency Name" },
    "amount": { path: "finance.amount", label: "Amount" },
  }
};

export function FakerData() {
  const [selectedLocale, setSelectedLocale] = useState('en');
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [generatedData, setGeneratedData] = useState('');
  const [mappings, setMappings] = useState<{ id: string, selector: string, method: string }[]>([]);

  const addMapping = () => {
    setMappings(prev => [...prev, { id: `map-${Date.now()}`, selector: '', method: '' }]);
  };

  const removeMapping = (id: string) => {
    setMappings(prev => prev.filter(m => m.id !== id));
  };

  const updateMapping = (id: string, field: 'selector' | 'method', value: string) => {
    setMappings(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const handleCheckboxChange = (path: string) => {
    setCheckedItems(prev => ({ ...prev, [path]: !prev[path] }));
  };

  const handleGenerate = () => {
    const customFaker = new faker({ locale: allLocales[selectedLocale] });
    let output = "";

    const resolvePath = (path: string, obj: any) => {
        return path.split('.').reduce((prev, curr) => {
            return prev ? prev[curr] : null
        }, obj || self);
    }

    for (const category in FAKER_METHODS) {
        for (const key in FAKER_METHODS[category]) {
            const item = FAKER_METHODS[category][key];
            if (checkedItems[item.path]) {
                const func = resolvePath(item.path, customFaker) as () => string;
                if (typeof func === 'function') {
                    output += `${item.label}: ${func()}\n`;
                }
            }
        }
    }
    setGeneratedData(output);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* --- Left Column: Data Selection --- */}
      <div className="lg:col-span-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Faker Data Types</CardTitle>
            <CardDescription>Select the data you want to generate.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Locale</Label>
                <Select value={selectedLocale} onValueChange={setSelectedLocale}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Locale" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(allLocales).sort().map(loc => (
                      <SelectItem key={loc} value={loc}>{allLocales[loc].title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {Object.entries(FAKER_METHODS).map(([category, items]) => (
                  <div key={category}>
                    <h4 className="font-semibold text-md mb-2">{category}</h4>
                    <div className="space-y-2">
                      {Object.values(items).map(item => (
                        <div key={item.path} className="flex items-center space-x-2">
                          <Checkbox
                            id={item.path}
                            checked={!!checkedItems[item.path]}
                            onCheckedChange={() => handleCheckboxChange(item.path)}
                          />
                          <Label htmlFor={item.path} className="font-normal">{item.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <Button className="w-full" onClick={handleGenerate}>Generate</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* --- Right Column: Preview and Mapping --- */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Generated Data Preview</CardTitle>
            <CardDescription>A preview of the generated data.</CardDescription>
          </CardHeader>
          <CardContent>
             <Textarea
                readOnly
                placeholder="Generated data will appear here..."
                value={generatedData}
                className="h-48 font-mono text-xs"
             />
             <div className="flex space-x-2 mt-4">
                <Button variant="secondary" onClick={handleGenerate}>Regenerate</Button>
                <Button variant="outline" onClick={() => navigator.clipboard.writeText(generatedData)}>Copy All</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dynamic Field Mapping</CardTitle>
            <CardDescription>Map generated data to CSS selectors for auto-filling.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {mappings.map((mapping) => (
                  <div key={mapping.id} className="flex items-end space-x-2 p-2 border rounded-md">
                    <div className="flex-grow space-y-1">
                      <Label htmlFor={`selector-${mapping.id}`}>CSS Selector</Label>
                      <Input
                        id={`selector-${mapping.id}`}
                        placeholder="e.g., #username, input[name=email]"
                        value={mapping.selector}
                        onChange={(e) => updateMapping(mapping.id, 'selector', e.target.value)}
                      />
                    </div>
                    <div className="flex-grow space-y-1">
                      <Label htmlFor={`method-${mapping.id}`}>Faker Method</Label>
                       <Select
                         value={mapping.method}
                         onValueChange={(value) => updateMapping(mapping.id, 'method', value)}
                       >
                         <SelectTrigger id={`method-${mapping.id}`}>
                           <SelectValue placeholder="Select data type..." />
                         </SelectTrigger>
                         <SelectContent>
                          {Object.entries(FAKER_METHODS).map(([category, items]) => (
                            <div key={category}>
                              <Separator/>
                              <Label className="pl-2 text-xs font-semibold text-muted-foreground">{category}</Label>
                              {Object.values(items).map(item => (
                                <SelectItem key={item.path} value={item.path}>{item.label}</SelectItem>
                              ))}
                            </div>
                          ))}
                         </SelectContent>
                       </Select>
                    </div>
                    <Button variant="destructive" size="icon" onClick={() => removeMapping(mapping.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex space-x-2 mt-2">
                <Button onClick={addMapping}>Add Field Mapping</Button>
                <Button variant="secondary" disabled>Save Template</Button>
                <Button variant="outline" disabled>Load Template</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}