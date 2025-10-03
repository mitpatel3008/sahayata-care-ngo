import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Edit, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import BeneficiaryForm from "./BeneficiaryForm";

interface Beneficiary {
  id: string;
  name: string;
  date_of_birth: string;
  gender: string;
  disability_type: string;
  guardian_name: string;
  guardian_phone: string;
  city: string;
  state: string;
}

const BeneficiaryList = () => {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [filteredBeneficiaries, setFilteredBeneficiaries] = useState<Beneficiary[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    fetchBeneficiaries();
  }, []);

  useEffect(() => {
    const filtered = beneficiaries.filter(
      (b) =>
        b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.guardian_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.city.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredBeneficiaries(filtered);
  }, [searchTerm, beneficiaries]);

  const fetchBeneficiaries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("beneficiaries")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching beneficiaries:", error);
    } else {
      setBeneficiaries(data || []);
      setFilteredBeneficiaries(data || []);
    }
    setLoading(false);
  };

  const getDisabilityColor = (type: string) => {
    const colors: Record<string, string> = {
      physical: "bg-primary",
      visual: "bg-secondary",
      hearing: "bg-accent",
      intellectual: "bg-muted-foreground",
      multiple: "bg-destructive",
      other: "bg-muted",
    };
    return colors[type] || "bg-muted";
  };

  const calculateAge = (dob: string) => {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    setSelectedBeneficiary(null);
    fetchBeneficiaries();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">Loading beneficiaries...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>All Beneficiaries ({filteredBeneficiaries.length})</CardTitle>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search by name, guardian, or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredBeneficiaries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchTerm ? "No beneficiaries found matching your search" : "No beneficiaries added yet"}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBeneficiaries.map((beneficiary) => (
                <Card key={beneficiary.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{beneficiary.name}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {calculateAge(beneficiary.date_of_birth)} years • {beneficiary.gender}
                        </p>
                      </div>
                      <Badge className={`${getDisabilityColor(beneficiary.disability_type)} text-white capitalize`}>
                        {beneficiary.disability_type}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Guardian</p>
                      <p className="font-medium">{beneficiary.guardian_name}</p>
                      <p className="text-sm text-muted-foreground">{beneficiary.guardian_phone}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="text-sm">{beneficiary.city}, {beneficiary.state}</p>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedBeneficiary(beneficiary);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Edit Beneficiary</DialogTitle>
          </DialogHeader>
          {selectedBeneficiary && (
            <BeneficiaryForm
              beneficiaryId={selectedBeneficiary.id}
              onSuccess={handleEditSuccess}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BeneficiaryList;
