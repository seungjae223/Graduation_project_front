// Expose existing private dialogs only in the audit bundle, without source edits.
module.exports = function(source) {
  const exports = {
    'SignUp.jsx': 'SignUpTopAlert, SignupCompleteModal',
    'MyPage.jsx': 'LocationPermissionModal',
    'AdminInquiryWrite.jsx': 'AdminSuccessModal',
    'RouteCreate.jsx': 'FixPointModal, FavoritePlacesModal, CompleteModalPreview',
    'RouteResult.jsx': 'MemoModal',
  };
  const names = exports[require('path').basename(this.resourcePath)];
  if (require('path').basename(this.resourcePath) === 'RouteCreate.jsx') {
    const portal = source.match(/\{isCompleteModalOpen && (createPortal\([\s\S]*?document\.body\s*\))\}/);
    if (!portal) throw new Error('Cannot find the existing completion modal');
    source += `\nfunction CompleteModalPreview({open, onClose}) {
      const completeDialogRef = useModalFocus({open, onClose, lockScroll: true});
      const handleCloseCompleteModal = onClose, handleConfirmRoute = onClose, handleSaveRouteLater = onClose;
      const isSavingRoute = false, isGeneratingRoute = false;
      return open ? ${portal[1]} : null;
    }\n`;
  }
  return names ? source + '\nexport { ' + names + ' };\n' : source;
};
