import { useEffect, useState } from "react";
import "../global.css";
import {
  Company,
  CompensationAndLevel,
  getCompanyInformationFromLevels,
  getCompensationDataForCompany,
} from "../utils/compensation/levelsFyiDataProvider";

const getCompanyInfo = async (): Promise<Company> => {
  return await getCompanyInformationFromLevels("amazon");
};

const getCompensationInformation = async (
  company: Company
): Promise<CompensationAndLevel[]> => {
  return await getCompensationDataForCompany(company);
};

export const Popup = () => {
  const [companyInformation, setCompanyInformation] = useState<Company | null>(
    null
  );
  const [compensationInformation, setCompensationInformation] = useState<
    CompensationAndLevel[] | null
  >(null);

  useEffect(() => {
    const getData = async () => {
      const companyData = await getCompanyInfo();
      const compensationData = await getCompensationInformation(companyData);
      setCompanyInformation(companyData);
      setCompensationInformation(compensationData);
    };
    getData();
  }, []);
  getCompanyInfo();
  return (
    <div className="text p-10 font-extrabold">
      {companyInformation ? (
        <div>{JSON.stringify(companyInformation)}</div>
      ) : (
        <div>Waiting for data</div>
      )}
      {compensationInformation ? (
        <div>{JSON.stringify(compensationInformation)}</div>
      ) : (
        <div>Waiting for data 2</div>
      )}
    </div>
  );
};
