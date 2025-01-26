import React, { Suspense, useState } from "react";
import "../global.css";
import { DataTable } from "./dataTable";
import LoadingSpinner from "./loading";
import { CompanyData } from "./types";
import { getCompanyDataForTable, saveTableDataToCache } from "./helpers";
import { Toast } from "./modals";

const Options = () => {
  const [isToastVisible, setIsToastVisible] = useState(false);

  const fetchCompanyData = async (): Promise<CompanyData[]> => {
    return await getCompanyDataForTable();
  };

  const CompanyDataComponent = React.lazy(async () => {
    const data = await fetchCompanyData();
    return {
      default: () => <DataTable companyData={data} onSave={handleOnSave} />,
    };
  });

  const handleOnSave = (companyData: CompanyData[]) => {
    saveTableDataToCache(companyData);

    setIsToastVisible(true);

    const timer = setTimeout(() => {
      setIsToastVisible(false);
    }, 3000);

    return () => clearTimeout(timer);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50">
      <style>{`
        @keyframes fadeOut {
          0% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
      `}</style>
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Settings</h1>
      <h2 className="text-xl font-semibold text-gray-600 mb-6">
        Company Link Settings
      </h2>
      <Suspense fallback={<LoadingSpinner />}>
        <CompanyDataComponent />
      </Suspense>
      {isToastVisible && <Toast message="Data saved successfully!" />}
    </div>
  );
};

export default Options;
