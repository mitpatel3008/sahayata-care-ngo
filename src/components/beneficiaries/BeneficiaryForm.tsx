import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { z } from "zod";

const beneficiarySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  date_of_birth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["male", "female", "other"]),
  disability_type: z.enum(["physical", "visual", "hearing", "intellectual", "multiple", "other"]),
  disability_percentage: z.number().min(0).max(100).optional(),
  guardian_name: z.string().min(2, "Guardian name is required").max(100),
  guardian_phone: z.string().min(10, "Valid phone number required").max(15),
  guardian_email: z.string().email("Valid email required").optional().or(z.literal("")),
  address: z.string().min(5, "Address is required").max(500),
  city: z.string().min(2, "City is required").max(100),
  state: z.string().min(2, "State is required").max(100),
  pincode: z.string().min(6, "Valid pincode required").max(6),
  aadhaar_number: z.string().max(12).optional().or(z.literal("")),
  udid_number: z.string().max(50).optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

interface BeneficiaryFormProps {
  beneficiaryId?: string;
  onSuccess: () => void;
}

const BeneficiaryForm = ({ beneficiaryId, onSuccess }: BeneficiaryFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    date_of_birth: "",
    gender: "male",
    disability_type: "physical",
    disability_percentage: "",
    guardian_name: "",
    guardian_phone: "",
    guardian_email: "",
    address: "",
    city: "",
    state: "Gujarat",
    pincode: "",
    aadhaar_number: "",
    udid_number: "",
    notes: "",
  });

  useEffect(() => {
    if (beneficiaryId) {
      fetchBeneficiary();
    }
  }, [beneficiaryId]);

  const fetchBeneficiary = async () => {
    const { data, error } = await supabase
      .from("beneficiaries")
      .select("*")
      .eq("id", beneficiaryId)
      .single();

    if (error) {
      toast.error("Failed to load beneficiary data");
    } else if (data) {
      setFormData({
        ...data,
        disability_percentage: data.disability_percentage?.toString() || "",
        guardian_email: data.guardian_email || "",
        aadhaar_number: data.aadhaar_number || "",
        udid_number: data.udid_number || "",
        notes: data.notes || "",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToValidate = {
        ...formData,
        disability_percentage: formData.disability_percentage ? parseInt(formData.disability_percentage) : undefined,
        guardian_email: formData.guardian_email || undefined,
        aadhaar_number: formData.aadhaar_number || undefined,
        udid_number: formData.udid_number || undefined,
        notes: formData.notes || undefined,
      };

      const validation = beneficiarySchema.safeParse(dataToValidate);

      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("You must be logged in");
        setLoading(false);
        return;
      }

      const beneficiaryData: any = {
        ...validation.data,
        created_by: user.id,
      };

      let error;
      if (beneficiaryId) {
        const result = await supabase
          .from("beneficiaries")
          .update(beneficiaryData)
          .eq("id", beneficiaryId);
        error = result.error;
      } else {
        const result = await supabase
          .from("beneficiaries")
          .insert([beneficiaryData]);
        error = result.error;
      }

      if (error) {
        toast.error(error.message);
      } else {
        toast.success(beneficiaryId ? "Beneficiary updated successfully" : "Beneficiary added successfully");
        onSuccess();
      }
    } catch (error: any) {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Student Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="date_of_birth">Date of Birth *</Label>
          <Input
            id="date_of_birth"
            type="date"
            value={formData.date_of_birth}
            onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gender">Gender *</Label>
          <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="disability_type">Disability Type *</Label>
          <Select value={formData.disability_type} onValueChange={(value) => setFormData({ ...formData, disability_type: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="physical">Physical</SelectItem>
              <SelectItem value="visual">Visual</SelectItem>
              <SelectItem value="hearing">Hearing</SelectItem>
              <SelectItem value="intellectual">Intellectual</SelectItem>
              <SelectItem value="multiple">Multiple</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="disability_percentage">Disability Percentage</Label>
          <Input
            id="disability_percentage"
            type="number"
            min="0"
            max="100"
            value={formData.disability_percentage}
            onChange={(e) => setFormData({ ...formData, disability_percentage: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="guardian_name">Guardian Name *</Label>
          <Input
            id="guardian_name"
            value={formData.guardian_name}
            onChange={(e) => setFormData({ ...formData, guardian_name: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="guardian_phone">Guardian Phone *</Label>
          <Input
            id="guardian_phone"
            type="tel"
            value={formData.guardian_phone}
            onChange={(e) => setFormData({ ...formData, guardian_phone: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="guardian_email">Guardian Email</Label>
          <Input
            id="guardian_email"
            type="email"
            value={formData.guardian_email}
            onChange={(e) => setFormData({ ...formData, guardian_email: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address *</Label>
        <Textarea
          id="address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          required
          rows={2}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">City *</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="state">State *</Label>
          <Input
            id="state"
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pincode">Pincode *</Label>
          <Input
            id="pincode"
            value={formData.pincode}
            onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
            required
            maxLength={6}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="aadhaar_number">Aadhaar Number</Label>
          <Input
            id="aadhaar_number"
            value={formData.aadhaar_number}
            onChange={(e) => setFormData({ ...formData, aadhaar_number: e.target.value })}
            maxLength={12}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="udid_number">UDID Number</Label>
          <Input
            id="udid_number"
            value={formData.udid_number}
            onChange={(e) => setFormData({ ...formData, udid_number: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
        />
      </div>

      <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading}>
        {loading ? "Saving..." : beneficiaryId ? "Update Beneficiary" : "Add Beneficiary"}
      </Button>
    </form>
  );
};

export default BeneficiaryForm;
