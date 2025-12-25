import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AvatarUpload } from "./avatar-upload";

describe("AvatarUpload", () => {
  it("renders initials when no avatar is provided", () => {
    render(<AvatarUpload initialAvatarUrl={null} displayName="Test User" />);

    expect(screen.getByText("TU")).toBeInTheDocument();
  });

  it("renders image when avatar url is provided", () => {
    render(
      <AvatarUpload
        initialAvatarUrl="https://example.com/avatar.png"
        displayName="Test User"
      />,
    );

    const img = screen.getByAltText("Profile avatar preview");
    expect(img).toBeInTheDocument();
  });

  it("updates preview when file is selected", () => {
    // jsdom may not implement URL.createObjectURL by default; add it if missing
    if (!(URL as unknown as { createObjectURL?: (file: File) => string }).createObjectURL) {
      (URL as unknown as { createObjectURL: (file: File) => string }).createObjectURL =
        vi.fn(() => "blob:preview-url");
    }

    // jsdom may not implement URL.revokeObjectURL by default; add it if missing
    if (!(URL as unknown as { revokeObjectURL?: (url: string) => void }).revokeObjectURL) {
      (URL as unknown as { revokeObjectURL: (url: string) => void }).revokeObjectURL =
        vi.fn();
    }

    const createObjectURLSpy = vi
      .spyOn(
        URL as unknown as { createObjectURL: (file: File) => string },
        "createObjectURL",
      )
      .mockReturnValue("blob:preview-url");

    const revokeObjectURLSpy = vi
      .spyOn(
        URL as unknown as { revokeObjectURL: (url: string) => void },
        "revokeObjectURL",
      )
      .mockImplementation(() => {});

    const { container } = render(
      <AvatarUpload initialAvatarUrl={null} displayName="Test User" />,
    );

    const fileInput = container.querySelector(
      'input[type="file"][name="avatar"]',
    ) as HTMLInputElement | null;
    const file = new File(["avatar"], "avatar.png", { type: "image/png" });

    if (!fileInput) {
      throw new Error("File input not found");
    }
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(createObjectURLSpy).toHaveBeenCalledWith(file);

    createObjectURLSpy.mockRestore();
    revokeObjectURLSpy.mockRestore();
  });
});
