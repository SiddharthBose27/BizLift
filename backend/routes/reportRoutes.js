import express from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireWorkspace } from '../middleware/requireWorkspace.js';
import { requireWorkspaceAccess } from '../middleware/requireWorkspaceAccess.js';
import { requirePermission } from '../middleware/requireRole.js';
import { getVendorSummaryState } from '../repositories/vendorSummaryRepository.js';
import { buildOperationsReport } from '../services/reportingService.js';

const router=express.Router();
router.get('/operations', requireAuth, requireWorkspace, requireWorkspaceAccess, requirePermission('reports:read'), (req,res)=>{
  try {
    const state=getVendorSummaryState(req.workspace);
    const data=buildOperationsReport({...state,days:req.query.days,now:new Date()});
    res.json({success:true,data,workspace:req.workspace});
  } catch(error) { console.error('GET /api/reports/operations error:',error); res.status(500).json({success:false,message:'Failed to build operations report.'}); }
});
export default router;
