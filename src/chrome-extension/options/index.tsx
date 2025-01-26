import React, { Suspense } from "react";
import "../global.css";
import { DataTable } from "./dataTable";
import LoadingSpinner from "./loading";
import { CompanyData } from "./types";
import { getCompanyDataForTable, saveTableDataToCache } from "./helpers";

const defaultData: CompanyData[] = [
  {
    companyId: "amazon",
    companyName: "amazon web services",
    lastFetchSuccess: true,
  },
];

const Options = () => {
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
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Settings</h1>
      <h2 className="text-xl font-semibold text-gray-600 mb-6">
        Company Link Settings
      </h2>
      <Suspense fallback={<LoadingSpinner />}>
        <CompanyDataComponent />
      </Suspense>
    </div>
  );
};

export default Options;
