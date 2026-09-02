import OfficeScene from "../../components/office/OfficeScene.jsx";
import { BestXI } from "../../components/lineup/BestXI.jsx";

export default function BestXIScreen({
  data,
  onNavigate,
  ...props
}) {
  return (
    <OfficeScene
      section="xi"
      data={data}
      onNavigate={onNavigate}
    >
      <BestXI
        {...props}
      />
    </OfficeScene>
  );
}
